/*
 * protoBox2d JavaScript Library, version 1.1
 * http://lab.hisasann.com/protoBox2d/
 * require : prototype.js 1.6
 *
 * Copyright (c) 2009 hisasann http://hisasann.com/
 * Dual licensed under the MIT and GPL licenses.
 */
var protoBox2d = function() {};
protoBox2d.prototype = {
	worldAABB : null,
	world : null,
	stage : [],
	walls : [],
	elements : null,
	bodies : [],
	properties : [],
	delta : [0, 0],
	timeStep : 1.0/60,
	iteration : 1,
	
	mouseX : 0,
	mouseY : 0,
	mouseJoint : null,
	isPlaying : false,
	isMouseDown : false,

	init : function() {
		var size = this.getWindowSize();
		
		this.stage[0] = size.width;
		this.stage[1] = size.height;

		document.onmousedown = this.onDocumentMouseDown.bindAsEventListener(this);
		document.onmouseup = this.onDocumentMouseUp.bindAsEventListener(this);
		document.onmousemove = this.onDocumentMouseMove.bindAsEventListener(this);
		
		worldAABB = new b2AABB();
		worldAABB.minVertex.Set(-200, -200);
		worldAABB.maxVertex.Set( screen.width + 200, screen.height + 200);

		this.world = new b2World(worldAABB, new b2Vec2(0, 0), true);

		this.setWalls();
		
		this.elements = document.getElementsByClassName("box2d");
		for (i = 0; i < this.elements.length; i++) {
			var element = this.elements[i];
			this.properties[i] = Position.cumulativeOffset(element);
			this.properties[i][2] = element.offsetWidth;
			this.properties[i][3] = element.offsetHeight;
		}

		for (i = 0; i < this.elements.length; i++) {
			var element = this.elements[i];
			element.style["position"] = "absolute";
			element.style["left"] = this.properties[i][0] + "px";
			element.style["top"] = this.properties[i][1] + "px";

			var room = this.createBox(this.world, this.properties[i][0] + (this.properties[i][2] >> 1),
								this.properties[i][1] + (this.properties[i][3] >> 1),
								this.properties[i][2] / 2,
								this.properties[i][3] / 2,
								false);
			room.m_linearVelocity = new b2Vec2((Math.random() - .5) * 10, (Math.random() - .5) * 10);
			this.bodies[i] = room;
		}
		
		this.play(25);
	},
	
	play : function(interval) {
		var _this = this;
		setInterval(function() {
			_this.loop();
		}, interval);
	},
	
	setWalls : function() {
		var wallSize = 200;
		this.walls[0] = this.createBox(this.world, this.stage[0] / 2, - wallSize, this.stage[0], wallSize);					// top
		this.walls[1] = this.createBox(this.world, this.stage[0] / 2, this.stage[1] + wallSize, this.stage[0], wallSize);	// bottom
		this.walls[2] = this.createBox(this.world, - wallSize, this.stage[1] / 2, wallSize, this.stage[1]);					// left
		this.walls[3] = this.createBox(this.world, this.stage[0] + wallSize, this.stage[1] / 2, wallSize, this.stage[1]);	// right
	},
	
	createBox : function(world, x, y, width, height, fixed, element) {
		if (typeof(fixed) == "undefined") fixed = true;
		var boxSd = new b2BoxDef();
		if (!fixed) boxSd.density = 1.0;
		boxSd.extents.Set(width, height);
		var boxBd = new b2BodyDef();
		boxBd.AddShape(boxSd);
		boxBd.position.Set(x,y);
		boxBd.userData = {element: element};
		return world.CreateBody(boxBd)
	},
	
	loop : function() {
		this.delta[0] += (0 - this.delta[0]) * .5;
		this.delta[1] += (0 - this.delta[1]) * .5;

		this.world.m_gravity.x = 0 + this.delta[0];
		this.world.m_gravity.y = 650 + this.delta[1];

		this.mouseDrag();

		this.world.Step(this.timeStep, this.iteration);

		for (i = 0; i < this.elements.length; i++) {
			var element = this.elements[i];

			element.style["left"] = (this.bodies[i].m_position0.x - (this.properties[i][2] >> 1)) + "px";
			element.style["top"] = (this.bodies[i].m_position0.y - (this.properties[i][3] >> 1)) + "px";		
			element.style["-webkit-transform"] = "rotate(" + (this.bodies[i].m_rotation0 * 57.2957795) + "deg)";
		}
	},

	onDocumentMouseDown : function(e) {
		this.isMouseDown = true;
		return false;
	},

	onDocumentMouseUp : function (e) {
		this.isMouseDown = false;
		return false;
	},

	onDocumentMouseMove : function(e) {
		if (!this.isPlaying) {
			this.isPlaying = true;
			var _this = this;
			setInterval(function() {
				_this.loop();
			}, 25);
		}

		this.mouseX = e.clientX;
		this.mouseY = e.clientY;
	},
	
	mouseDrag : function() {
		// mouse press
		if (this.isMouseDown && !this.mouseJoint) {
			var body = this.getBodyAtMouse();

			if (body) {
				var md = new b2MouseJointDef();
				md.body1 = this.world.m_groundBody;
				md.body2 = body;
				md.target.Set(this.mouseX, this.mouseY);
				md.maxForce = 30000.0 * body.m_mass;
				md.timeStep = this.timeStep;
				this.mouseJoint = this.world.CreateJoint(md);
				body.WakeUp();
			}
		}

		// mouse release
		if (!this.isMouseDown) {
			if (this.mouseJoint) {
				this.world.DestroyJoint(this.mouseJoint);
				this.mouseJoint = null;
			}
		}

		// mouse move
		if (this.mouseJoint) {
			var p2 = new b2Vec2(this.mouseX, this.mouseY);
			this.mouseJoint.SetTarget(p2);
		}
	},
	
	getBodyAtMouse : function() {
		var mousePVec = new b2Vec2();
		mousePVec.Set(this.mouseX, this.mouseY);

		var aabb = new b2AABB();
		aabb.minVertex.Set(this.mouseX - 1, this.mouseY - 1);
		aabb.maxVertex.Set(this.mouseX + 1, this.mouseY + 1);

		var k_maxCount = 10;
		var shapes = new Array();
		var count = this.world.Query(aabb, shapes, k_maxCount);
		var body = null;

		for (var i = 0; i < count; ++i) {
			if (shapes[i].m_body.IsStatic() == false) {
				if (shapes[i].TestPoint(mousePVec)) {
					body = shapes[i].m_body;
					break;
				}
			}
		}
		return body;
	},
	
	getWindowSize : function() {
		function getWindowWidth(){
			if(window.innerWidth) return window.innerWidth; // Mozilla, Opera, NN4
			if(document.documentElement && document.documentElement.clientWidth){ // 以下 IE
				return document.documentElement.clientWidth;
			}else if(document.body && document.body.clientWidth){
				return document.body.clientWidth;
			}
			return 0;
		}
		
		function getWindowHeight(){
			if(window.innerHeight) return window.innerHeight; // Mozilla, Opera, NN4
			if(document.documentElement && document.documentElement.clientHeight){ // 以下 IE
				return document.documentElement.clientHeight;
			}else if(document.body && document.body.clientHeight){
				return document.body.clientHeight;
			}
			return 0;
		}

		// var scrollLeft =  window.pageXOffset
		// 				|| document.documentElement.scrollLeft
		// 				|| document.body.scrollLeft
		// 				|| 0;
		// 
		// var scrollTop =  window.pageYOffset
		// 				|| document.documentElement.scrollTop
		// 				|| document.body.scrollTop
		// 				|| 0;
		// return {
		// 	width: getWindowWidth() + scrollLeft,
		// 	height: getWindowHeight() + scrollTop
		// }

		return {
			width: getWindowWidth(),
			height: getWindowHeight()
		}
	}
}