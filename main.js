import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const gridStartX = -7;
const gridStartZ = -8;
const gridEndX = 7;
const gridEndZ = 7;

const offset = 7;

const grid = [];
const centipede = [];
const mushrooms = [];
let bullets = [];
let player;
let playerCanShoot = true;

let points = 0;
let playerLives = 3;
let round = 0;

let pause = false;

let camera1;
let camera2;

let switchCamera = false;

const pointsContainer = document.getElementById('points');
const livesContainer = document.getElementById('lives');
const gameOverContainer = document.getElementById('game-over-container');
const gameOverPoints = document.getElementById('gameOverPoints');
const restartGameButton = document.getElementById('restartGameButton');

function init() {
    initalizeGrid();
    restartGameButton.addEventListener("click", restartGame);
    const scene = new THREE.Scene();
    camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Create a 15x15 grid with white lines and no center lines.
    const gridHelper = new THREE.GridHelper(15, 15, 0xffffff, 0xffffff);
    scene.add(gridHelper);

    createCentipede(scene);
    createPlayer(scene, camera1, renderer);

    for (let i = 0; i < 14; i++) {
        createMushroom(scene, i - offset);
    }
    
    // Position the grid as needed.
    gridHelper.position.set(0, 0, 0); // You can adjust the position according to your scene.
    
    camera1.position.z = 7;
    camera1.position.y = 1;
    camera2.position.z = 10;
    camera2.position.y = 10;
    camera2.rotateX(-1);
    animate(scene, camera2, renderer);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            switchCamera = !switchCamera;
        }
    })
}

function animate(scene, camera, renderer) {
    if (!switchCamera) {
        camera = camera2;
    } else {
        camera = camera1;
    }
    requestAnimationFrame(() => animate(scene, camera, renderer));
    if (!pause) {
        renderer.render(scene, camera);
        
        // Update and move centipede
        centipede.forEach(part => {
            part.move();
            let posX = Math.round(part.position.x);
            let posZ = Math.round(part.position.z);
            if (player.position.x === posX && player.position.z === posZ) {
                playerLives -= 1;
                if (playerLives <= 0) {
                    gameOver(scene);
                } else {
                    resetLevel(scene);
                }
            }
        })
    
        // Update and remove bullets
        bullets.forEach(bullet => {
            bullet.update();
            
            // Remove the bullet if it goes out of bounds
            if (bullet.position.z < gridStartZ || bullet.position.z > gridEndZ) {
                scene.remove(bullet);
                bullets.splice(bullets.indexOf(bullet), 1);
            }
    
            detectCollisionWithMushroom(bullet, scene);
            detectCollisionWithCentipede(bullet, scene);
        });
       
        updatePoints();
        updateLives();
    
        if (centipede.length === 0) {
            resetLevel(scene);
        }
    } 
}

function createCentipede(scene, posX, posZ, parts) {
    if (!posZ) {
        posZ = gridStartZ;
    }

    // create the head
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    if (!posX) {
        head.position.set(5 - offset, 0.5, posZ);
    } else {
        head.position.set(posX, 0.5, posZ);
    }
    head.direction = new THREE.Vector3(0.05, 0, 0);
    head.up = 1;
    head.move = function () {
       this.position.add(this.direction); 
       if (this.position.x > gridEndX || this.position.x < gridStartX) {
            this.direction.x *= -1;
            this.position.z += this.up;
       } 
       // collisions with mushrooms
       if (grid[Math.round(this.position.z)][Math.round(this.position.x)]) {
            this.direction.x *= -1;
            this.position.z += this.up; 
        }
        if (this.position.z >= gridEndZ) {
            this.up = -1;
        }
        if (this.position.z <= gridStartZ) {
            this.up = 1;
        }
    };
    head.type = "head";
    head.setPartType= function (inType) {
        this.type = inType
    }
    // create the rest
    let centipedeParts = parts;
    if (!centipedeParts) {
        centipedeParts = 5;
    }
    for (let i = 0; i < centipedeParts; i++) {
        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        if (!posX) {
            sphere.position.set(i - offset ,0.5, posZ);
        } else {
            head.position.set(posX - (i + 1), 0.5, posZ);
        }
        sphere.direction = new THREE.Vector3(0.05, 0, 0);
        sphere.up = 1;
        sphere.move = function () {
            this.position.add(this.direction);
            if (this.position.x > gridEndX || this.position.x < gridStartX) {
                this.direction.x *= -1;
                this.position.z += this.up;
            } 
            if (grid[Math.round(this.position.z)][Math.round(this.position.x)]) {
                this.direction.x *= -1;
                this.position.z += this.up; 
            }
            if (this.position.z >= gridEndZ) {
                this.up = -1;
            }
            if (this.position.z <= gridStartZ) {
                this.up = 1;
            }
        };
        sphere.type = "body";
        sphere.setPartType = function (inType) {
            this.type = inType
        }
        centipede.push(sphere);
        scene.add(sphere);
    }
    centipede.push(head);
    scene.add(head); 
}

function createPlayer(scene, camera, renderer) {
    const BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0x0e4c92,
        emissive: 0x0e4c92,
    });
    player = new THREE.Mesh(BoxGeometry, boxMaterial);
    player.position.set(0, 0.5, 7);
    scene.add(player);

    document.addEventListener("keydown", function (e) {
        switch (e.key) {
            case "w":
            case "W":
                // TODO
                break;
            case "a":
            case "A":
                player.position.x -= 1;
                if (is_out_of_grid(player)) {
                    player.position.x += 1;
                }
                break;
            case "s":
            case "S":
                // TODO
                break;
            case "d":
            case "D":
                player.position.x += 1;
                if (is_out_of_grid(player)) {
                    player.position.x -= 1;
                }
                break;
            case " ":
                // only shoot once per spacebar hit
                if (playerCanShoot) {
                    playerCanShoot = false;
                    playerShoot(scene, camera, renderer, player);
                }
                break;
        }
        document.addEventListener("keyup", function (e) {
            if (e.key === " ") {
                playerCanShoot = true;
            }
        })
        camera1.position.copy(player.position);
    });
}

function createMushroom(scene, line, xPos) {

    // Generate a random integer between -7 and 7 (inclusive) 
    if (!xPos && xPos != 0) {
        xPos = Math.max(-6, Math.min(Math.floor(Math.random() * 15) - 7, 6));
    }

    const BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc0cb,
        emissive: 0xfffc0cb,
    });
    const mushroom = new THREE.Mesh(BoxGeometry, boxMaterial);
    mushroom.position.set(xPos, 0.5, line);
    scene.add(mushroom);
    const mushroomObject = {
        mushroom,
        lives: 4,
    }
    mushrooms.push(mushroomObject);
    setGridTileAsOccupied(xPos, line);

}

function is_out_of_grid(object) {
    if (object.position.z < gridStartZ || object.position.z > gridEndZ) {
        return true;
    }
    if (object.position.x < gridStartX || object.position.x > gridEndX) {
        return true;
    }
    return false;
}

function initalizeGrid() {
    for (let y = -8; y <= 7; y++) {
        grid[y] = [];
        for (let x = -7; x <= 7; x++) {
          grid[y][x] = false;
        }
      }
}

function setGridTileAsOccupied(x, z) {
    x = parseInt(x, 10);
    z = parseInt(z, 10);
    if (x >= gridStartX && x <= gridEndX && z >= gridStartZ && z <= gridEndZ) {
        grid[z][x] = true;
      }
}

function setGridTileAsFree(x, z) {
    x = parseInt(x, 10);
    z = parseInt(z, 10);
    if (x >= gridStartX && x <= gridEndX && z >= gridStartZ && z <= gridEndZ) {
        grid[z][x] = false;
      } 
}

function playerShoot(scene, camera, renderer, player) {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Set the initial position of the bullet to the player's position
    bullet.position.copy(player.position.clone());

    // Set the direction of the bullet (you can adjust the value based on your needs)
    const shootDirection = new THREE.Vector3(0, 0, -0.2);
    bullet.direction = shootDirection;

    // Add the bullet to the scene
    scene.add(bullet);

    // Update function to move the bullet in the specified direction
    bullet.update = function () {
        this.position.add(this.direction);
    };

    // Push the bullet to an array to keep track of it
    bullets.push(bullet);

}

function detectCollisionWithMushroom(bullet, scene) {
    for (let i = 0; i < mushrooms.length; i++) {
        if (Math.round(bullet.position.x) === mushrooms[i].mushroom.position.x && Math.round(bullet.position.z) === mushrooms[i].mushroom.position.z) {
            mushrooms[i].lives -= 1;
            scene.remove(bullet);
            bullets.splice(bullets.indexOf(bullet), 1);
            if (mushrooms[i].lives <= 0) {
                scene.remove(mushrooms[i].mushroom);
                setGridTileAsFree(mushrooms[i].mushroom.position.x, mushrooms[i].mushroom.position.z);
                mushrooms.splice(i, 1);
                points += 1;
            }
        }
    }
}

function detectCollisionWithCentipede(bullet, scene) {
    const bulletPosX = Math.round(bullet.position.x);
    const bulletPosZ = Math.round(bullet.position.z);
    for (let i = 0; i < centipede.length; i++) {
        let part = centipede[i];
        const posX = Math.round(part.position.x);
        const posZ = Math.round(part.position.z);
        
        if (bulletPosX === posX && bulletPosZ === posZ) {
            scene.remove(bullet);
            bullets.splice(bullets.indexOf(bullet), 1);
            console.log("hit: ", part.type);
            scene.remove(part);
            centipede.splice(i, 1);
            createMushroom(scene, posZ, posX);
            if (part.type === "body") {
                points += 10;
                if (centipede[i-1]) {
                    makeHead(centipede[i - 1]);
                }
                if (centipede[i + 1] && !centipede[i + 2]) {
                    makeHead(centipede[i + 1]);
                }
            } else if (part.type === "head") {
                points += 100;
                if (centipede[i - 1]) {
                    makeHead(centipede[i - 1]);
                }
            }
        }
    }
}

function resetLevel(scene) {
    for (let i = 0; i < centipede.length; i++) {
        scene.remove(centipede[i]);
    }
    for (let i = 0; i < bullets.length; i++) {
        scene.remove(bullets[i]); 
    }
    for (let i = 0; i < mushrooms.length; i++) {
        scene.remove(mushrooms[i].mushroom); 
    }
    centipede.length = 0;
    bullets.length = 0;
    mushrooms.length = 0;

    initalizeGrid();

    createCentipede(scene);

    for (let i = 0; i < 14; i++) {
        createMushroom(scene, i - offset);
    }
}

function gameOver(scene) {
    resetLevel(scene);
    showGameOverScreen();
    pause = true;
    round = 0;
    playerLives = 3;
    points = 0;
}

function makeHead(part) {
    part.setPartType("head");
    part.material.color.set(0xff0000);
}

function updatePoints() {
    pointsContainer.textContent = `Points: ${points}`;
}

function updateLives() {
    livesContainer.textContent = `Lives: ${playerLives}`;
}

function showGameOverScreen() {
    gameOverContainer.style.display = 'flex';
    gameOverPoints.textContent = `Points: ${points}`;
}

function restartGame() {
    pause = false;
    gameOverContainer.style.display = 'none';
}

init();