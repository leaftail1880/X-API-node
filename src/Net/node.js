import http from "http";
import SocketBE from "socket-be";
import { v4 } from "uuid";

process.env.TZ ??= "Etc/GMT+3";

class NodeManager {
	/**
	 * Maps specified reciever to path
	 * @template {keyof import("./routes.js").NODE_ROUTES} Path
	 * @param {Path} path
	 * @template {{req: any, res: any}} [Route=import("./routes.js").NODE_ROUTES[Path]]
	 * @param {(req: Route["req"]) => Route["res"]} reciever
	 */
	Route(path, reciever) {
		this.HTTP_ROUTES[path] = reciever;
	}
	/**
	 * Runs specified scriptevent with data. If data more than
	 * @template {keyof import("./routes.js").MINECRAFT_ROUTES} Path
	 * @param {Path} scriptevent
	 * @param {import("./routes.js").MINECRAFT_ROUTES[Path]["req"]} data
	 * @returns {Promise<import("./routes.js").MINECRAFT_ROUTES[Path]["res"]>}
	 */
	async SendToMC(scriptevent, data) {
		if (!this.WORLD)
			return this.WS_SERVER.logger.error(
				`Failed to send data to '${scriptevent}': No world currently connected!`
			);

		const uuid = v4();
		const stringData = JSON.stringify({ uuid, data });
		// Will resolve when mc makes http request with response
		const promise = new Promise(
			(resolve) => (this.WS_REQUESTS[uuid] = resolve)
		);

		if (stringData.length > this.WS_DATA_LIMIT) {
			const chunks = stringData.match(this.WS_DATA_SPLITTER);
			for (const [i, chunk] of chunks.entries()) {
				/** @type {import("./routes.js").MCDataChunk} */
				const chunkData = {
					chunk,
					done: i === chunks.length - 1 ? 1 : 0,
					uuid,
				};
				await this.WORLD.runCommand(
					`scriptevent CHUNK:${scriptevent} C${JSON.stringify(chunkData)}`
				);
			}
		} else
			this.WORLD.runCommand(`scriptevent NODE:${scriptevent} ${stringData}`);

		return promise;
	}

	//#region HTTPServer
	logger = new SocketBE.Logger("HttpServer", {
		timezone: process.env.TZ,
	});

	/**
	 * @type {Record<string, (body: any) => any>}
	 * @private
	 */
	HTTP_ROUTES = {};
	/**
	 * @private
	 */
	HTTP_PORT = "9090";

	//#endregion

	//#region Websocket
	/**
	 * @private
	 */
	WS_PORT = "9091";
	/**
	 * @private
	 */
	WS_SERVER;
	/**
	 * @private
	 */
	WS_DATA_LIMIT = 2048;
	/**
	 * @private
	 */
	WS_DATA_SPLITTER = new RegExp(".{1," + this.WS_DATA_LIMIT + "}", "g");
	/**
	 * @type {import("socket-be/typings/structures/World.js")}
	 * @private
	 */
	WORLD;

	/**
	 * @type {Record<string, (a: any) => void>}
	 * @private
	 */
	WS_REQUESTS = {};
	//#endregion

	constructor() {
		//#region HttpServer
		http
			.createServer((req, res) => {
				const url = new URL(req.url, `http://${req.headers.host}`);
				// Remove / from start of string
				const path = url.pathname.replace(/^\//, "");

				if (path in this.HTTP_ROUTES) {
					let body = "";
					req.on("data", (chunk) => (body += chunk.toString()));
					req.on("close", () => {
						res.statusCode = 200;
						const response = this.HTTP_ROUTES[path](JSON.parse(body));

						if (response)
							return res
								.setHeader("content-type", "text/plain")
								.write(JSON.stringify(response), (err) => {
									if (err) this.logger.error(err);
									res.end();
								});
						else res.end();
					});
				} else {
					this.logger.error(404, "Unknown path:", path);
					res.statusCode = 404;
					res.statusMessage = "Unknown path: " + path;
					res.end();
				}
			})
			.on("listening", () => {
				this.logger.info("Listening on http://localhost:" + this.HTTP_PORT);
			})
			.listen(parseInt(this.HTTP_PORT));
		//#endregion

		//#region Websocket
		this.WS_SERVER = new SocketBE.Server({
			port: Number(this.WS_PORT),
			timezone: process.env.TZ,
		});
		this.WS_SERVER.events.on("worldAdd", ({ world }) => {
			if (this.WORLD) {
				world.logger.error("Failed to connect second world");
				world.close();
			} else {
				world.logger.log("World attached!");
				this.WORLD = world;
			}
		});

		this.WS_SERVER.events.on("worldRemove", ({ world }) => {
			world.logger.error("Disconected!");
			this.WORLD = null;
		});

		this.Route("scripteventResponse", (req) => {
			return this.WS_REQUESTS[req.uuid](req.response);
		});
		//#endregion
	}
}

export const NodeApp = new NodeManager();
