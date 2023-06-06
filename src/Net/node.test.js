import { NodeApp } from "./node.js";

setTimeout(() => {
	console.time("LongData");
	const data = "DATA".repeat(3000);
	NodeApp.SendToMC("test", data).then((e) => {
		if (e !== data.length) throw new Error("Data doenst was recieved1");
		console.timeEnd("LongData");
	});
}, 10 * 4000);
