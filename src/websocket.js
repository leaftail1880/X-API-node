import SocketBE from "socket-be";
import World from "socket-be/typings/structures/World.js";

const PORT = process.env.WS_PORT ?? "9090";
const SERVER = new SocketBE.Server({
	port: Number(PORT),
	timezone: process.env.TZ,
});
const DATA_LIMIT = 2048;
const DATA_SPLITTER = new RegExp(".{1," + DATA_LIMIT + "}", "g");
/**
 * @type {World}
 */
let WORLD;

SERVER.events.on("worldAdd", ({ world }) => {
	if (WORLD) {
		world.logger.error("Failed to connect second world");
		world.close();
	} else {
		world.logger.log("World attached!");
		WORLD = world;
	}
});

SERVER.events.on("worldRemove", ({ world }) => {
	world.logger.error("Disconected!");
	WORLD = null;
});

// TODO routes shema
/**
 *
 * @param {string} scriptevent
 * @param {Record<string, any>} data
 */
export function sendDataToWorld(scriptevent, data) {
	if (!WORLD)
		SERVER.logger.error(
			"Failed to send data to " +
				scriptevent +
				": no world currently connected!"
		);

	const sdata = JSON.stringify(data);
	if (sdata.length > DATA_LIMIT) {
		for (const chunk of sdata.match(DATA_SPLITTER)) {
			// TODO actual implementation
		}
	} else WORLD.runCommand(`scriptevent ${scriptevent} ${data}`);
}
