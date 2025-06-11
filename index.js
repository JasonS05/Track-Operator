"use strict";

window.onload = main;

let can;
let ctx;
let spriteSheet;

let levelsUnlocked = 1;
let mapCollected = false;
let isPlaying = false;

let currentLevel = {
	data: new Array(270)
};

let levelData = initializeLevelData();

let cursorLocation = {
	x: -1,
	y: -1
};

let playButtonLocation = {
	x: 13 * 16,
	y: 11 * 16
};

async function main() {
	can = document.getElementById("can");
	ctx = can.getContext("2d");

	let promise = fetchSpriteSheet();

	assignEventHandlers();
	loadLevel(1);

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
	} else {
		timeElapsed += dt;

		if (timeElapsed >= 0.1) {
			dt -= timeElapsed - 0.1;
			timeElapsed = 0;
		}

		let movement = dt * 10;

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
				levelsUnlocked = currentLevel.number + 1;
				mapCollected = true;
			}

			if (steve.x < 0 || steve.x >= 27 || steve.y < 0 || steve.y >= 10) {
				steve.direction = undefined;
			} else {
				let tile = currentLevel.data[steve.x + 27 * steve.y];
				let localDirection = transformDirection(steve.direction, tile.direction, tile.flipped, false);

				switch (tile.type) {
				case "straight":
					if (localDirection === "west" || localDirection === "east") {
						localDirection = undefined;
					}

					break;

				case "turn":
				case "TJunctionOff":
				case "TJunctionOn":
					if (localDirection === "north" && tile.type != "TJunctionOff") {
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
						localDirection = "west";
					}

					break;

				case "crossroads":
					break;

				default:
					steve.direction = undefined;
					break;
				}

				steve.direction = transformDirection(localDirection, tile.direction, tile.flipped, true);
			}
		}
	}

	render();

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
	});

	can.addEventListener("mousemove", function(event) {
		cursorLocation.x = event.offsetX / 2 - 2;
		cursorLocation.y = event.offsetY / 2 - 2;
	});

	let clickStart = {
		x: -1,
		y: -1
	};

	can.addEventListener("mousedown", function(event) {
		clickStart.x = event.offsetX / 2 - 2;
		clickStart.y = event.offsetY / 2 - 2;
	});

	can.addEventListener("mouseup", function(event) {
		let clickEnd = {
			x: event.offsetX / 2 - 2,
			y: event.offsetY / 2 - 2
		};

		if (
			clickStart.x >= playButtonLocation.x      &&
			clickStart.x <  playButtonLocation.x + 16 &&
			clickStart.y >= playButtonLocation.y      &&
			clickStart.y <  playButtonLocation.y + 16 &&
			clickEnd  .x >= playButtonLocation.x      &&
			clickEnd  .x <  playButtonLocation.x + 16 &&
			clickEnd  .y >= playButtonLocation.y      &&
			clickEnd  .y <  playButtonLocation.y + 16
		) {
			isPlaying = !isPlaying;

			if (isPlaying === false) {
				mapCollected = false;
			}
		}
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

					let [spriteX, spriteY] = getSpriteSheetPixelCoords(currentLevel.data[gridX + 27 * gridY], pixelX, pixelY);

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
	"leftButton3" : [13,    5 ]
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
	currentLevel.number = number;

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

		if (tile.type) {
			tile.direction = mapping3[data[i]];
			i++;
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
		}

		let iterations = 0;

		while (data[i] >= "0" && data[i] <= "9") {
			iterations = 10 * iterations + parseInt(data[i]);
			i++;
		}

		iterations = iterations || 1;

		while (iterations--) {
			currentLevel.data[index] = tile;
			index++;
		}
	}

	while (index < 270) {
		currentLevel.data[index] = {};
		index++;
	}
}

function initializeLevelData() {
	return [
		{
			steve: {
				x: 1,
				y: 0,
				direction: "east"
			},
			map: {
				x: 10,
				y: 5
			},
			data: "s>10t>$_10sv$_10sv$_10sv$_10sv$_10sv$_10sv"
		}
	]
}

