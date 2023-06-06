type MINECRAFT_ROUTES =
	import("../../../development_behavior_packs/X-API/scripts/lib/Net/routes.js").MINECRAFT_ROUTES;

export interface NODE_ROUTES {
	ping: { req: any; res: { status: number } };
	test: { req: any; res: any };
	scripteventResponse: { req: { uuid: string; response: any }; res: any };
	playerPlatform: {
		req: { playerName: string };
		res: { platform: "win10" | "android" | "console" };
	};
}

interface MCDataChunk {
	uuid: string;
	done: 0 | 1;
	chunk: string;
}
