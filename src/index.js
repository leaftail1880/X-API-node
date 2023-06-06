import "dotenv/config";
import { NodeApp } from "./Net/node.js";

NodeApp.Route("ping", (req) => {
	return { status: 200 };
});
