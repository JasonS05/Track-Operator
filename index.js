"use strict";

window.onload = main;

let can;
let ctx;
let sprite;

let levelsUnlocked = 1;

let currentLevel = {
	data: new Array(270)
};

let levelData = initializeLevelData();

async function main() {
	can = document.getElementById("can");
	ctx = can.getContext("2d");

	let promise = fetchSprite();

	loadLevel(1);

	await promise;

	mainLoop();
}

function mainLoop() {
	render();

	requestAnimationFrame(mainLoop);
}

function render() {
	let imageData = ctx.createImageData(432, 200);

	for (let gridY = 0; gridY < 10; gridY++) {
		for (let gridX = 0; gridX < 27; gridX++) {
			for (let pixelY = 0; pixelY < 16; pixelY++) {
				for (let pixelX = 0; pixelX < 16; pixelX++) {
					let x = pixelX + 16 * gridX;
					let y = pixelY + 16 * gridY;

					let [spriteX, spriteY] = getSpritePixelCoords(currentLevel.data[gridX + 27 * gridY], pixelX, pixelY);

					let spriteIndex = 4 * (spriteX + 256 * spriteY);
					let canvasIndex = 4 * (x + 432 * y);

					imageData.data[canvasIndex + 0] = sprite.data[spriteIndex + 0];
					imageData.data[canvasIndex + 1] = sprite.data[spriteIndex + 1];
					imageData.data[canvasIndex + 2] = sprite.data[spriteIndex + 2];
					imageData.data[canvasIndex + 3] = sprite.data[spriteIndex + 3];
				}
			}
		}
	}

	for (let pixelY = 0; pixelY < 12; pixelY++) {
		for (let pixelX = 0; pixelX < 12; pixelX++) {
			let x = Math.round(currentLevel.steve.x * 16) + pixelX + 2;
			let y = Math.round(currentLevel.steve.y * 16) + pixelY + 2;

			let spriteX = 244 + pixelX;
			let spriteY = 244 + pixelY;

			let spriteIndex = 4 * (spriteX + 256 * spriteY);
			let canvasIndex = 4 * (x + 432 * y);

			imageData.data[canvasIndex + 0] = sprite.data[spriteIndex + 0];
			imageData.data[canvasIndex + 1] = sprite.data[spriteIndex + 1];
			imageData.data[canvasIndex + 2] = sprite.data[spriteIndex + 2];
			imageData.data[canvasIndex + 3] = sprite.data[spriteIndex + 3];
		}
	}

	for (let pixelY = 0; pixelY < 16; pixelY++) {
		for (let pixelX = 0; pixelX < 16; pixelX++) {
			let x = Math.round(currentLevel.steve.x * 16 + pixelX) - 4;
			let y = Math.round(currentLevel.steve.y * 16 + pixelY) - 4;

			let [spriteX, spriteY] = getSpritePixelCoords({type: "arrow", direction: currentLevel.steve.direction}, pixelX, pixelY);

			let spriteIndex = 4 * (spriteX + 256 * spriteY);
			let canvasIndex = 4 * (x + 432 * y);

			let spriteAlpha = sprite.data[spriteIndex + 3];
			let canvasAlpha = imageData.data[canvasIndex + 3];

			// assumes data uses premultiplied alpha
			imageData.data[canvasIndex + 0] = sprite.data[spriteIndex + 0] + imageData.data[canvasIndex + 0] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 1] = sprite.data[spriteIndex + 1] + imageData.data[canvasIndex + 1] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 2] = sprite.data[spriteIndex + 2] + imageData.data[canvasIndex + 2] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 3] = 255 - (255 - spriteAlpha) * (255 - canvasAlpha) / 255;
		}
	}

	for (let pixelY = 0; pixelY < 16; pixelY++) {
		for (let pixelX = 0; pixelX < 16; pixelX++) {
			let x = currentLevel.map.x * 16 + pixelX;
			let y = currentLevel.map.y * 16 + pixelY;

			let spriteX =   0 + pixelX;
			let spriteY = 240 + pixelY;

			let spriteIndex = 4 * (spriteX + 256 * spriteY);
			let canvasIndex = 4 * (x + 432 * y);

			let spriteAlpha = sprite.data[spriteIndex + 3];
			let canvasAlpha = imageData.data[canvasIndex + 3];

			// assumes data uses premultiplied alpha
			imageData.data[canvasIndex + 0] = sprite.data[spriteIndex + 0] + imageData.data[canvasIndex + 0] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 1] = sprite.data[spriteIndex + 1] + imageData.data[canvasIndex + 1] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 2] = sprite.data[spriteIndex + 2] + imageData.data[canvasIndex + 2] * (255 - spriteAlpha) / 255;
			imageData.data[canvasIndex + 3] = 255 - (255 - spriteAlpha) * (255 - canvasAlpha) / 255;
		}
	}

	ctx.putImageData(imageData, 1, 1);
}

let mapping1 = {
	"turn": [0, 0],
	"straight": [0, 1],
	"TJunctionOff": [0, 2],
	"TJunctionOn": [0, 3],
	"YJunction": [0, 4],
	"crossroads": [0, 5],
	"arrow": [9.875, 13]
};

function getSpritePixelCoords(obj, x, y) {
	let [offsetX, offsetY] = obj.type? mapping1[obj.type] : [0, 6];

	if (obj.button) {
		offsetX = 1;
	}

	if (obj.steel) {
		offsetX = 2;
	}

	switch (obj.direction) {
		case "south":
		x = 15 - x;
		y = 15 - y;
		break;

		case "east":
		[x, y] = [y, 15 - x];
		break;

		case "north":
		break;

		case "west":
		[x, y] = [15 - y, x];
		break;
	}

	if (obj.flipped) {
		x = 15 - x;
	}

	return [x + 16 * offsetX, y + 16 * offsetY];
}

async function fetchSprite() {
	let image = new Image(256, 256);
	image.src = "trackgame.png";

	let tempCanvas = document.createElement("canvas");
	tempCanvas.width = tempCanvas.height = 256;

	let tempCtx = tempCanvas.getContext("2d");
	await image.decode();
	tempCtx.drawImage(image, 0, 0);

	sprite = tempCtx.getImageData(0, 0, 256, 256);
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
	"v": "south",
	">": "east",
	"^": "north",
	"<": "west"
}

function loadLevel(number) {
	currentLevel.steve = levelData[number - 1].steve;
	currentLevel.map = levelData[number - 1].map;

	let data = levelData[number - 1].data;

	let index = 0;
	let obj;
	let i = 0
	while (i < data.length) {
		obj = {};

		if (data[i] === "$") {
			let newIndex = index - (index % 27) + 27;

			while (index < newIndex) {
				currentLevel.data[index] = {};
				index++;
			}

			i++;
			continue;
		}

		obj.type = mapping2[data[i]];
		i++;

		if (obj.type) {
			obj.direction = mapping3[data[i]];
			i++;
		}

		if (data[i] === "f") {
			obj.flipped = true;
			i++
		}

		if (data[i] === "S") {
			obj.steel = true;
			i++;
		} else if (data[i] === "B") {
			obj.button = true;
			i++;
		}

		let iterations = 0;

		while (data[i] >= "0" && data[i] <= "9") {
			iterations = 10 * iterations + parseInt(data[i]);
			i++;
		}

		iterations = iterations || 1;

		while (iterations--) {
			currentLevel.data[index] = obj;
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
				x: 0,
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

