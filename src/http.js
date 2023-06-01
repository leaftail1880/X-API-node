import http from "http";
import SocketBE from "socket-be";

const logger = new SocketBE.Logger("HttpServer", { timezone: "Etc/GMT+3" });
const port = process.env.HTTP_PORT ?? "9091";

// TODO routes validation
/**
 * @type {Record<string, (a: {
 *   body: string,
 *   url: URL,
 *   headers: http.IncomingHttpHeaders
 * }) => any>}
 */
const ROUTES = {
	index({ body, url, headers }) {
		logger.debug("Indexing keys for", { body, headers });
		return { roures: Object.keys(ROUTES), version: "" };
	},
};

http
	.createServer((req, res) => {
		const url = new URL(req.url, `http://${req.headers.host}`);
		const path = url.pathname.replace(/^\//, "");

		if (path in ROUTES) {
			let body = "";
			req.on("data", (chunk) => (body += chunk.toString()));
			req.on("close", () => {
				res.statusCode = 200;
				const response = ROUTES[path]({ body, url, headers: req.headers });
				if (response)
					return res
						.setHeader("content-type", "text/plain")
						.write(JSON.stringify(response), (err) => {
							if (err) logger.error(err);
							res.end();
						});
				else res.end();
			});
		} else {
			logger.error(404, "Unknown path:", path);
			res.statusCode = 404;
			res.statusMessage = "Unknown path: " + path;
			res.end();
		}
	})
	.on("listening", () => {
		logger.info("Listening on http://localhost:" + port);
	})
	.listen(parseInt(port));
