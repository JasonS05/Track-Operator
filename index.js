"use strict";

window.onload = main;

let can;
let ctx;
let spriteSheet;

const speed = 5;

let mapCollected = false;
let isPlaying = false;
let unregisteredChange = true;

let currentLevel = {
	data: new Array(270)
};

let levelData = initializeLevelData();

let cursorLocation = {
	x: -1,
	y: -1
};

let backButtonLocation = {
	x: 0.5 * 16,
	y: 11 * 16
};

let playButtonLocation = {
	x: 13 * 16,
	y: 11 * 16
};

let forwardButtonLocation = {
	x: 25.5 * 16,
	y: 11 * 16
};

async function main() {
	let promise = fetchSpriteSheet();

	can = document.getElementById("can");
	ctx = can.getContext("2d");

	if (!parseInt(localStorage.getItem("levelsUnlocked"))) {
		localStorage.setItem("levelsUnlocked", "1");
	}

	assignEventHandlers();

	loadLevel(parseInt(localStorage.getItem("levelsUnlocked")));

	await promise;

	mainLoop();
}

let currentTime = Date.now() / 1000;
let timeElapsed = 0;

function mainLoop() {
	let newTime = Date.now() / 1000;
	let dt = newTime - currentTime;
	currentTime = newTime;

	let steve = currentLevel.steve;

	if (!isPlaying) {
		steve.x = steve.spawnX;
		steve.y = steve.spawnY;
		steve.direction = steve.spawnDirection;

		if (unregisteredChange) {
			unregisteredChange = false;
			render();
		}

		timeElapsed = 0;
	} else {
		timeElapsed += dt;

		if (timeElapsed >= 1 / speed) {
			dt -= timeElapsed - 1 / speed;
			timeElapsed = 0;
		}

		let movement = dt * speed;

		switch (steve.direction) {
		case "north":
			steve.y -= movement;
			break;

		case "west":
			steve.x -= movement;
			break;

		case "south":
			steve.y += movement;
			break;

		case "east":
			steve.x += movement;
			break;
		}

		if (timeElapsed === 0) {
			steve.x = Math.round(steve.x);
			steve.y = Math.round(steve.y);

			if (steve.x === currentLevel.map.x && steve.y === currentLevel.map.y) {
				localStorage.setItem("levelsUnlocked", Math.max(parseInt(localStorage.getItem("levelsUnlocked")), Math.min(currentLevel.number + 1, 9)).toString());
				mapCollected = true;

				new Audio("win.ogg").play();
			}

			if (steve.x < 0 || steve.x >= 27 || steve.y < 0 || steve.y >= 10) {
				steve.direction = undefined;
			} else {
				let tile = currentLevel.data[steve.x + 27 * steve.y];

				if (tile.button) {
					for (let i = 0; i < tile.switches.length; i++) {
						let switchedTile = currentLevel.data[tile.switches[i].x + 27 * tile.switches[i].y];

						switchedTile.switched = !switchedTile.switched;

						new Audio("gearswitch.ogg").play();
					}
				}

				let type = tile.type;
				let flipped = tile.flipped;

				if (tile.switched) {
					if (tile.type === "TJunctionOff") {
						type = "TJunctionOn";
					} else if (tile.type === "TJunctionOn") {
						type = "TJunctionOff";
					} else if (tile.type === "YJunction") {
						flipped = !flipped;
					}
				}

				let localDirection = transformDirection(steve.direction, tile.direction, flipped, false);

				switch (type) {
				case "straight":
					if (localDirection === "west" || localDirection === "east") {
						localDirection = undefined;
					}

					break;

				case "turn":
				case "TJunctionOff":
				case "TJunctionOn":
					if (localDirection === "north" && type != "TJunctionOff") {
						localDirection = "east";
					}

					if (localDirection === "west") {
						localDirection = "south";
					}

					break;

				case "YJunction":
					if (localDirection === "east" || localDirection === "west") {
						localDirection = "south";
					}

					if (localDirection === "north") {
						localDirection = "east";
					}

					break;

				case "crossroads":
					break;

				default:
					steve.direction = undefined;
					break;
				}

				steve.direction = transformDirection(localDirection, tile.direction, flipped, true);
			}
		}

		render();
	}

	requestAnimationFrame(mainLoop);
}

let directionToNumberMap = {
	"north": 0,
	"west" : 1,
	"south": 2,
	"east" : 3
};

let numberToDirectionMap = {
	0: "north",
	1: "west",
	2: "south",
	3: "east"
};

function transformDirection(direction, rotation, flipped, inverse) {
	if (direction === undefined) {
		return undefined;
	}

	direction = directionToNumberMap[direction];

	if (!inverse) {
		direction = (direction - directionToNumberMap[rotation] + 4) % 4;

		if (flipped) {
			if (direction === 1) {
				direction = 3;
			} else if (direction === 3) {
				direction = 1;
			}
		}
	} else {
		if (flipped) {
			if (direction === 1) {
				direction = 3;
			} else if (direction === 3) {
				direction = 1;
			}
		}

		direction = (direction + directionToNumberMap[rotation]) % 4
	}

	return numberToDirectionMap[direction];
}

function assignEventHandlers() {
	can.addEventListener("mouseleave", function() {
		cursorLocation.x = -1;
		cursorLocation.y = -1;

		unregisteredChange = true;
	});

	can.addEventListener("mousemove", function(event) {
		cursorLocation.x = event.offsetX / 2 - 2;
		cursorLocation.y = event.offsetY / 2 - 2;

		unregisteredChange = true;
	});

	can.addEventListener("mousedown", function(event) {
		let click = {
			x: event.offsetX / 2 - 2,
			y: event.offsetY / 2 - 2
		};

		if (
			click.x >= playButtonLocation.x      &&
			click.x <  playButtonLocation.x + 16 &&
			click.y >= playButtonLocation.y      &&
			click.y <  playButtonLocation.y + 16
		) {
			isPlaying = !isPlaying;

			if (isPlaying === false) {
				mapCollected = false;

				for (let i = 0; i < 270; i++) {
					currentLevel.data[i].switched = false;
				}
			}

			unregisteredChange = true;

			return;
		} else if (
			click.x >= backButtonLocation.x      &&
			click.x <  backButtonLocation.x + 16 &&
			click.y >= backButtonLocation.y      &&
			click.y <  backButtonLocation.y + 16 &&
			currentLevel.number > 1
		) {
			loadLevel(currentLevel.number - 1);
		} else if (
			click.x >= forwardButtonLocation.x      &&
			click.x <  forwardButtonLocation.x + 16 &&
			click.y >= forwardButtonLocation.y      &&
			click.y <  forwardButtonLocation.y + 16 &&
			parseInt(localStorage.getItem("levelsUnlocked")) > currentLevel.number &&
			currentLevel.number < 9
		) {
			loadLevel(currentLevel.number + 1);
		} else if (!isPlaying) {
			let x = Math.floor(click.x / 16);
			let y = Math.floor(click.y / 16);

			if (x >= 0 && x < 27 && y >= 0 && y < 10) {
				let tile = currentLevel.data[x + 27 * y];

				if (!tile.steel) {
					if (tile.type === "TJunctionOff") {
						tile.type = "TJunctionOn";

						new Audio("gearswitch.ogg").play();
					} else if (tile.type === "TJunctionOn") {
						tile.type = "TJunctionOff";

						new Audio("gearswitch.ogg").play();
					} else if (tile.type === "YJunction") {
						tile.flipped = !tile.flipped;

						new Audio("gearswitch.ogg").play();
					}
				}
			}
		}

		unregisteredChange = true;
	});
}

function render() {
	let imageData = ctx.createImageData(432, 200);

	for (let gridY = 0; gridY < 10; gridY++) {
		for (let gridX = 0; gridX < 27; gridX++) {
			for (let pixelY = 0; pixelY < 16; pixelY++) {
				for (let pixelX = 0; pixelX < 16; pixelX++) {
					let x = pixelX + 16 * gridX;
					let y = pixelY + 16 * gridY;

					if (x < 0 || x >= 432 || y < 0 || y >= 200) {
						continue;
					}

					let tile = currentLevel.data[gridX + 27 * gridY];

					tile = {
						type: tile.type,
						direction: tile.direction,
						flipped: tile.flipped,
						steel: tile.steel,
						button: tile.button,
						switched: tile.switched
					}

					if (tile.switched) {
						if (tile.type === "TJunctionOff") {
							tile.type = "TJunctionOn";
						} else if (tile.type === "TJunctionOn") {
							tile.type = "TJunctionOff";
						} else if (tile.type === "YJunction") {
							tile.flipped = !tile.flipped;
						}
					}

					let [spriteX, spriteY] = getSpriteSheetPixelCoords(tile, pixelX, pixelY);

					let spriteIndex = 4 * (spriteX + 256 * spriteY);
					let canvasIndex = 4 * (x + 432 * y);

					imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0];
					imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1];
					imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2];
					imageData.data[canvasIndex + 3] = spriteSheet.data[spriteIndex + 3];
				}
			}
		}
	}

	if (!mapCollected) {
		for (let pixelY = 0; pixelY < 16; pixelY++) {
			for (let pixelX = 0; pixelX < 16; pixelX++) {
				let x = currentLevel.map.x * 16 + pixelX;
				let y = currentLevel.map.y * 16 + pixelY;

				if (x < 0 || x >= 432 || y < 0 || y >= 200) {
					continue;
				}

				let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: "map"}, pixelX, pixelY);

				let spriteIndex = 4 * (spriteX + 256 * spriteY);
				let canvasIndex = 4 * (x + 432 * y);

				let spriteAlpha = spriteSheet.data[spriteIndex + 3];
				let canvasAlpha = imageData.data[canvasIndex + 3];

				// assumes data uses premultiplied alpha
				imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0] + imageData.data[canvasIndex + 0] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1] + imageData.data[canvasIndex + 1] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2] + imageData.data[canvasIndex + 2] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 3] = 255 - (255 - spriteAlpha) * (255 - canvasAlpha) / 255;
			}
		}
	}

	for (let pixelY = 0; pixelY < 12; pixelY++) {
		for (let pixelX = 0; pixelX < 12; pixelX++) {
			let x = Math.round(currentLevel.steve.x * 16) + pixelX + 2;
			let y = Math.round(currentLevel.steve.y * 16) + pixelY + 2;

			if (x < 0 || x >= 432 || y < 0 || y >= 200) {
				continue;
			}

			let spriteX = 244 + pixelX;
			let spriteY = 244 + pixelY;

			let spriteIndex = 4 * (spriteX + 256 * spriteY);
			let canvasIndex = 4 * (x + 432 * y);

			imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0];
			imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1];
			imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2];
			imageData.data[canvasIndex + 3] = spriteSheet.data[spriteIndex + 3];
		}
	}

	if (!isPlaying) {
		for (let pixelY = 0; pixelY < 16; pixelY++) {
			for (let pixelX = 0; pixelX < 16; pixelX++) {
				let x = Math.round(currentLevel.steve.x * 16 + pixelX) - 4;
				let y = Math.round(currentLevel.steve.y * 16 + pixelY) - 4;

				if (x < 0 || x >= 432 || y < 0 || y >= 200) {
					continue;
				}

				let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: "arrow", direction: currentLevel.steve.direction}, pixelX, pixelY);

				let spriteIndex = 4 * (spriteX + 256 * spriteY);
				let canvasIndex = 4 * (x + 432 * y);

				let spriteAlpha = spriteSheet.data[spriteIndex + 3];
				let canvasAlpha = imageData.data[canvasIndex + 3];

				// assumes data uses premultiplied alpha
				imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0] + imageData.data[canvasIndex + 0] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1] + imageData.data[canvasIndex + 1] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2] + imageData.data[canvasIndex + 2] * (255 - spriteAlpha) / 255;
				imageData.data[canvasIndex + 3] = 255 - (255 - spriteAlpha) * (255 - canvasAlpha) / 255;
			}
		}
	}

	if (currentLevel.number > 1) {
		for (let pixelY = 0; pixelY < 16; pixelY++) {
			for (let pixelX = 0; pixelX < 16; pixelX++) {
				let x = backButtonLocation.x + pixelX;
				let y = backButtonLocation.y + pixelY;

				if (x < 0 || x >= 432 || y < 0 || y >= 200) {
					continue;
				}

				let buttonType = "leftButton";

				if (
					cursorLocation.x >= backButtonLocation.x      &&
					cursorLocation.x <  backButtonLocation.x + 16 &&
					cursorLocation.y >= backButtonLocation.y      &&
					cursorLocation.y <  backButtonLocation.y + 16
				) {
					buttonType = buttonType + "2";
				} else {
					buttonType = buttonType + "1";
				}

				let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: buttonType}, pixelX, pixelY);

				let spriteIndex = 4 * (spriteX + 256 * spriteY);
				let canvasIndex = 4 * (x + 432 * y);

				imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0];
				imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1];
				imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2];
				imageData.data[canvasIndex + 3] = spriteSheet.data[spriteIndex + 3];
			}
		}
	}

	for (let pixelY = 0; pixelY < 16; pixelY++) {
		for (let pixelX = 0; pixelX < 16; pixelX++) {
			let x = playButtonLocation.x + pixelX;
			let y = playButtonLocation.y + pixelY;

			if (x < 0 || x >= 432 || y < 0 || y >= 200) {
				continue;
			}

			let buttonType = isPlaying? "stopButton" : "playButton";

			if (
				cursorLocation.x >= playButtonLocation.x      &&
				cursorLocation.x <  playButtonLocation.x + 16 &&
				cursorLocation.y >= playButtonLocation.y      &&
				cursorLocation.y <  playButtonLocation.y + 16
			) {
				buttonType = buttonType + "2";
			} else {
				buttonType = buttonType + "1";
			}

			let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: buttonType}, pixelX, pixelY);

			let spriteIndex = 4 * (spriteX + 256 * spriteY);
			let canvasIndex = 4 * (x + 432 * y);

			imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0];
			imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1];
			imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2];
			imageData.data[canvasIndex + 3] = spriteSheet.data[spriteIndex + 3];
		}
	}

	if (currentLevel.number < 9) {
		for (let pixelY = 0; pixelY < 16; pixelY++) {
			for (let pixelX = 0; pixelX < 16; pixelX++) {
				let x = forwardButtonLocation.x + pixelX;
				let y = forwardButtonLocation.y + pixelY;

				if (x < 0 || x >= 432 || y < 0 || y >= 200) {
					continue;
				}

				let buttonType = "rightButton";

				if (parseInt(localStorage.getItem("levelsUnlocked")) <= currentLevel.number) {
					buttonType = buttonType + "3";
				} else if (
					cursorLocation.x >= forwardButtonLocation.x      &&
					cursorLocation.x <  forwardButtonLocation.x + 16 &&
					cursorLocation.y >= forwardButtonLocation.y      &&
					cursorLocation.y <  forwardButtonLocation.y + 16
				) {
					buttonType = buttonType + "2";
				} else {
					buttonType = buttonType + "1";
				}

				let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: buttonType}, pixelX, pixelY);

				let spriteIndex = 4 * (spriteX + 256 * spriteY);
				let canvasIndex = 4 * (x + 432 * y);

				imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0];
				imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1];
				imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2];
				imageData.data[canvasIndex + 3] = spriteSheet.data[spriteIndex + 3];
			}
		}
	}

	if (!isPlaying) {
		let tileX = Math.floor(cursorLocation.x / 16);
		let tileY = Math.floor(cursorLocation.y / 16);

		let tile = currentLevel.data[tileX + 27 * tileY];

		if (tile && tile.button) {
			for (let i = 0; i < tile.switches.length; i++) {
				for (let pixelY = 0; pixelY < 16; pixelY++) {
					for (let pixelX = 0; pixelX < 16; pixelX++) {
						let x = tile.switches[i].x * 16 + pixelX;
						let y = tile.switches[i].y * 16 + pixelY;

						if (x < 0 || x >= 432 || y < 0 || y >= 200) {
							continue;
						}

						let [spriteX, spriteY] = getSpriteSheetPixelCoords({type: "outline"}, pixelX, pixelY);

						let spriteIndex = 4 * (spriteX + 256 * spriteY);
						let canvasIndex = 4 * (x + 432 * y);

						let spriteAlpha = spriteSheet.data[spriteIndex + 3];
						let canvasAlpha = imageData.data[canvasIndex + 3];

						// assumes data uses premultiplied alpha
						imageData.data[canvasIndex + 0] = spriteSheet.data[spriteIndex + 0] + imageData.data[canvasIndex + 0] * (255 - spriteAlpha) / 255;
						imageData.data[canvasIndex + 1] = spriteSheet.data[spriteIndex + 1] + imageData.data[canvasIndex + 1] * (255 - spriteAlpha) / 255;
						imageData.data[canvasIndex + 2] = spriteSheet.data[spriteIndex + 2] + imageData.data[canvasIndex + 2] * (255 - spriteAlpha) / 255;
						imageData.data[canvasIndex + 3] = 255 - (255 - spriteAlpha) * (255 - canvasAlpha) / 255;
					}
				}
			}
		}
	}

	ctx.putImageData(imageData, 2, 2);
}

let mapping1 = {
	"turn"        : [0,     0 ],
	"straight"    : [0,     1 ],
	"TJunctionOff": [0,     2 ],
	"TJunctionOn" : [0,     3 ],
	"YJunction"   : [0,     4 ],
	"crossroads"  : [0,     5 ],
	"arrow"       : [9.875, 13],
	"map"         : [0,     15],
	"playButton1" : [15,    0 ],
	"playButton2" : [14,    0 ],
	"stopButton1" : [15,    2 ],
	"stopButton2" : [14,    2 ],
	"rightButton1": [15,    4 ],
	"rightButton2": [14,    4 ],
	"rightButton3": [13,    4 ],
	"leftButton1" : [15,    5 ],
	"leftButton2" : [14,    5 ],
	"leftButton3" : [13,    5 ],
	"outline"     : [0,     8 ]
};

function getSpriteSheetPixelCoords(tile, x, y) {
	let [offsetX, offsetY] = tile.type? mapping1[tile.type] : [0, 6];

	if (tile.button) {
		offsetX = 1;
	}

	if (tile.steel) {
		offsetX = 2;
	}

	switch (tile.direction) {
	case "north":
		break;

	case "west":
		[x, y] = [15 - y, x];
		break;

	case "south":
		x = 15 - x;
		y = 15 - y;
		break;

	case "east":
		[x, y] = [y, 15 - x];
		break;
	}

	if (tile.flipped) {
		x = 15 - x;
	}

	return [x + 16 * offsetX, y + 16 * offsetY];
}

async function fetchSpriteSheet() {
	let image = new Image(256, 256);
	image.src = "trackgame.png";

	let tempCanvas = document.createElement("canvas");
	tempCanvas.width = tempCanvas.height = 256;

	let tempCtx = tempCanvas.getContext("2d");
	await image.decode();
	tempCtx.drawImage(image, 0, 0);

	spriteSheet = tempCtx.getImageData(0, 0, 256, 256);
}

let mapping2 = {
	"t": "turn",
	"s": "straight",
	"j": "TJunctionOff",
	"J": "TJunctionOn",
	"y": "YJunction",
	"c": "crossroads"
};

let mapping3 = {
	"^": "north",
	"<": "west",
	"v": "south",
	">": "east"
}

function loadLevel(number) {
	isPlaying = false;
	mapCollected = false;

	currentLevel.number = number;

	if (!levelData[number - 1]) {
		currentLevel.steve = {
			spawnX: 0,
			spawnY: 0,
			spawnDirection: "east"
		}

		currentLevel.map = {
			x: 26,
			y: 9
		}

		for (let i = 0; i < 270; i++) {
			currentLevel.data[i] = {};
		}

		return;
	}

	currentLevel.steve = {
		spawnX:         levelData[number - 1].steve.x,
		spawnY:         levelData[number - 1].steve.y,
		spawnDirection: levelData[number - 1].steve.direction
	};

	currentLevel.map = levelData[number - 1].map;

	let data = levelData[number - 1].data;

	let index = 0;
	let tile;
	let i = 0
	while (i < data.length) {
		tile = {};

		if (data[i] === "$") {
			let newIndex = index - (index % 27) + 27;

			while (index < newIndex) {
				currentLevel.data[index] = {};
				index++;
			}

			i++;
			continue;
		}

		tile.type = mapping2[data[i]];
		i++;

		if (tile.type && tile.type !== "crossroads") {
			tile.direction = mapping3[data[i]];
			i++;
		}

		if (tile.type === "crossroads") {
			tile.direction = "north";
		}

		if (data[i] === "f") {
			tile.flipped = true;
			i++
		}

		if (data[i] === "S") {
			tile.steel = true;
			i++;
		} else if (data[i] === "B") {
			tile.button = true;

			i++;

			tile.switches = [];

			while (data[i] !== undefined && data[i] !== ")") {
				i++

				if (data[i] === ")") {
					break;
				}

				let [num1, length1] = parseNumber(data, i);

				i += length1 + 1;

				let [num2, length2] = parseNumber(data, i);

				i += length2;

				tile.switches.push({
					x: num1,
					y: num2
				});
			}

			i++;
		}

		let [num, length] = parseNumber(data, i);

		let iterations = num || 1;

		i += length;

		while (iterations--) {
			currentLevel.data[index] = tile;
			index++;
		}

		while (data[i] === " ") {
			i++;
		}
	}

	while (index < 270) {
		currentLevel.data[index] = {};
		index++;
	}
}

function parseNumber(data, i) {
	let output = 0;
	let n = 0;

	while (data[i + n] >= "0" && data[i + n] <= "9") {
		output = 10 * output + parseInt(data[i + n]);
		n++;
	}

	return [output, n];
}

function initializeLevelData() {
	return [
		{
			steve: {
				x: 1,
				y: 1,
				direction: "east"
			},
			map: {
				x: 6,
				y: 7
			},
			data:
				"$" +
				"_ s>5 t> $" +
				"_6 s^ $" +
				"_6 s^ $" +
				"_ t^ s>4 tv $" +
				"_ s^ $" +
				"_ s^ $" +
				"_ t< s>5"
		},
		{
			steve: {
				x: 3,
				y: 3,
				direction: "east"
			},
			map: {
				x: 14,
				y: 1
			},
			data:
				"$" +
				"_14 s^ $" +
				"_14 s^ $" +
				"_3 s>4 J> s>6 y> $" +
				"_7 s^ _6 s^ $" +
				"_7 s^ _6 s^ $" +
				"_7 t< s>6 tv"
		},
		{
			steve: {
				x: 20,
				y: 4,
				direction: "west"
			},
			map: {
				x: 9,
				y: 8
			},
			data:
				"$" +
				"_4 t^ s>4 j<f s>3 y^ s> t> $" +
				"_4 s^ _4 s^ _3 s^ _ s^ $" +
				"_4 s^ _4 s^ _3 s^ _ s^ $" +
				"_4 jvf s>4 jv _3 jvf s> c s>7 $" +
				"_4 s^ _4 s^ _3 s^ _ s^ $" +
				"_4 t< s>4 J^f _3 s^ _ s^ $" +
				"_9 y< s>3 yvf s> tv $" +
				"_9 s^"
		},
		{
			steve: {
				x: 24,
				y: 1,
				direction: "south"
			},
			map: {
				x: 11,
				y: 5
			},
			data:
				"$" +
				"_24 s^ $" +
				"_6 t^S s> J<f s>4 j> s>3 y^f s>S J<fS s>S2 t> _ sv $" +
				"_6 s^S _ s^S _4 s^ _3 s^ _ s^S _2 s^ _ s^ $" +
				"_6 s^S _ s^S _4 s^_ t^ s> c s>S yvfS s>S _ s^ _ s^ $" +
				"_6 y<fS s>S y>fS _2 s>2 tv _ s^ _ s^ _4 y< s> tv $" +
				"_6 s^S _ s^S _4 t^ s> c s> y>f _4 s^ $" +
				"_6 s^S _ s^S _4 s^ _ s^ _ s^ _4 s^ $" +
				"_6 t<S s>S J<S s>S s>3 j>f s> yv s> j< s>4 tv"
		},
		{
			steve: {
				x: 7,
				y: 5,
				direction: "east"
			},
			map: {
				x: 13,
				y: 5
			},
			data:
				"$" +
				"$" +
				"_5 t^ s>2 j>S s>S2 y^fS s>S j<fS s>S s> j> s> j> s> j> s> t> $" +
				"_5 s^ _2 s^S _2 s^S _ s^S _2 s^ _ s^ _ s^ _ JvfS s>S $" +
				"_5 s^B(11,2) _2 s^S _2 s^S _ s^ _2 s^B(11,2 16,2 22,3) _ s^B(18,2 22,3 8,5) _ s^B(13,2 22,4) _ j^S s>S $" +
				"_5 t< s>2 j<S s>S2 tvS _ s^ _2 t< s> j< s> j< s> tv"
		}
	]
}

