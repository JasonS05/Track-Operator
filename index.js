"use strict";

window.onload = main;

let can;
let ctx;

function main() {
	can = document.getElementById("can");
	ctx = can.getContext("2d");

	mainLoop();
}

function mainLoop() {


	requestAnimationFrame(mainLoop);
}

