/**
 * The main game object
 */
var Game = function() {
    this.config = {
        initalLives: 3,
        difficultyMultiplier: 0.2,

        shipSpeed: 20,

        rocketVelocity: 20,
        rocketMaxFireRate: 2,

        invaderVelocity: 10,
        invaderColumns: 4,
        invaderRows: 2,
        invaderPoints: 5,

        bombRate: 0.5,
        bombMinVelocity: 5,
        bombMaxVelocity: 20
    };

    this.characters = {
        space: ' ',
        block: '░',
        ship: '8',
        rocket: '|',
        bomb: 'O',
        invader: 'Y'
    };

    this.keys = {
        fire: 32, // Spacebar
        left: 37, // Left arrow
        right: 39, // Right arrow
        start: 32, // Spacebar
        restart: 27 // Escape
    };

    this.bounds = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    };

    this.score = 0;
    this.level = 1;
    this.lives = this.config.initalLives;

    this.stateStack = [];

    this.pressedKeys = {};
};

/**
 * Initalise the game with game element
 * @param {Object} element
 */
Game.prototype.init = function(element) {
    // Set the game element
    this.element = element;

    // Set up the game screen
    this.setBounds();

    // Initialise the content
    this.clear();
};

/**
 * Set the game bounds based on the element and character dimensions
 */
Game.prototype.setBounds = function() {
    var width = this.element.offsetWidth,
        height = this.element.offsetHeight,
        ruler = document.createElement('span'),
        style = window.getComputedStyle(this.element, null),
        line = parseInt(style.getPropertyValue('line-height'));

    ruler.style.font = style.getPropertyValue('font');
    ruler.style.fontSize = style.getPropertyValue('font-size');
    ruler.innerHTML = this.characters.block;

    document.body.appendChild(ruler);
    this.bounds.right = parseInt(width / ruler.offsetWidth);
    this.bounds.bottom = parseInt(height / line);
    document.body.removeChild(ruler);
}

/**
 * Helper method to retrive the current state
 * @return {Object|Null}
 */
Game.prototype.currentState = function() {
    return this.stateStack.length > 0 ? this.stateStack[this.stateStack.length - 1] : null;
};

/**
 * Helper method that moves to a state by poping old state and pushing new one
 * @param {Object} state
 */
Game.prototype.moveToState = function(state) {
    this.popState();
    this.pushState(state);
};

/**
 * Pop a state from the state stack, calling the leave method if available
 * @param {Object} state
 */
Game.prototype.popState = function() {
    // Leave and pop the state.
    if (this.currentState()) {
        if (this.currentState().leave) {
            this.currentState().leave(this);
        }

        // Set the current state.
        this.stateStack.pop();
    }
};

/**
 * Push a new state onto the state stack, calling enter method if available
 * @param {Object} state
 */
Game.prototype.pushState = function(state) {
    if (state.enter) {
        state.enter(this);
    }
    this.stateStack.push(state);
};

/**
 * Binding for key press input passing the numeric key code,
 * key will be added to the pressed keys object
 * @param {Number} keyCode
 */
Game.prototype.keyDown = function(keyCode) {
    this.pressedKeys[keyCode] = true;

    // Delegate to the current state too.
    if (this.currentState() && this.currentState().keyDown) {
        this.currentState().keyDown(this, keyCode);
    }
};

/**
 * Binding for key lift input passing the numeric key code,
 * key will be removed to the pressed keys object
 * @param {Number} keyCode
 */
Game.prototype.keyUp = function(keyCode) {
    delete this.pressedKeys[keyCode];

    // Delegate to the current state too.
    if (this.currentState() && this.currentState().keyUp) {
        this.currentState().keyUp(this, keyCode);
    }
};

/**
 * Clear all content and repopulate with a blank screen
 */
Game.prototype.clear = function() {
    var i = 0,
        row = Array(this.bounds.right+1).join(this.characters.space);

    this.content = [];
    for (i = 0; i < this.bounds.bottom+1; i++) {
        this.content.push(row);
    }
};

/**
 * Draw the string at the x and y coordinates given
 * @throws {Error} If x and y coordinates are out of bounds
 */
Game.prototype.draw = function(x, y, string) {
    var intX = parseInt(x),
        intY = parseInt(y);

    if (intX < this.bounds.left || intX > this.bounds.right ||
        intY < this.bounds.top || intY > this.bounds.bottom) {
        throw new Error('Out of bounds');
    }

    this.content[intY] = this.content[intY].substr(0, intX) + string + this.content[intY].substr(intX + string.length);
};

/**
 * Helper function to draw text in the center
 * @param {String} string
 */
Game.prototype.drawCenter = function(string) {
    var length = string.length
        x = 0,
        y = Math.floor(this.bounds.bottom/2);

    if (length < this.bounds.right) {
        x = parseInt((this.bounds.right / 2) - (length / 2));
    }

    return this.draw(x, y, string);
}

/**
 * Render the content to the element, wont render if nothing has changed
 * @return {Boolean} If changes to content were made
 */
Game.prototype.render = function() {
    var content = this.content.join('\n');
    if (this.element.innerHTML !== content) {
        this.element.innerHTML = content;
        return true;
    }
    return false;
};

/**
 * Kicks of the game by loading the welcome state and starting the game loop
 */
Game.prototype.start = function() {
    var self = this,
        lastTimestamp = 0;

    // Reset the game state
    this.reset();

    // Start by calling the first step
    window.requestAnimationFrame(step);

    /**
     * Gets the current state, updates state, draws state and renders
     * @param {Number} timestamp
     */
    function step(timestamp) {
        var currentState = self.currentState();

        if (currentState) {
            // Update the game with the delta period
            if(currentState.update) {
                currentState.update(self, ((timestamp - lastTimestamp) / 1000));
            }

            // Draw the current state
            if(currentState.draw) {
                currentState.draw(self);
            }

            // Render to the canvas any changes
            self.render();
        }

        // Call the next step
        lastTimestamp = timestamp;
        window.requestAnimationFrame(step);
    }
};

/**
 * Reset the game to start again
 */
Game.prototype.reset = function() {
    this.level = 1;
    this.score = 0;
    this.lives = this.config.initalLives;
    this.moveToState(new WelcomeState(game));
};

/**
 * Initial welcome state, reset the game
 * @param {Game} game
 */
var WelcomeState = function(game) {};

/**
 * Draw the welcome screen with instructions
 * @param {Game} game
 */
WelcomeState.prototype.draw = function(game) {
    game.clear();
    game.drawCenter('Welcome Press "Space"');
}

/**
 * Listen to the keyup code for game start and transition to new state
 * @param {Game} game
 * @param {Number} keyCode
 */
WelcomeState.prototype.keyUp = function(game, keyCode) {
    if (keyCode === game.keys.start) {
        game.moveToState(new LevelIntroState(game));
    }
}

/**
 * Level intro state, intalise countdown information
 * @param {Game} game
 */
var LevelIntroState = function(game) {
    this.countdown = 3;
    this.countdownMessage = '3';
};

/**
 * Update the internal countdown time and message
 * @param {Game} game
 * @param {Number} delta
 */
LevelIntroState.prototype.update = function(game, delta) {
    this.countdown -= delta;

    if (this.countdown < 2) {
        this.countdownMessage = '2';
    }
    if (this.countdown < 1) {
        this.countdownMessage = '1';
    }
    if (this.countdown <= 0) {
        game.moveToState(new PlayState(game));
    }
}

/**
 * Draw countdown messaging for the user
 * @param {Game} game
 */
LevelIntroState.prototype.draw = function(game) {
    game.clear();
    game.drawCenter('Start Level ' + game.level + ' in ' + this.countdownMessage);
}

/**
 * Main play state, intalise interal valuse for game pieces
 * @param {Game} game
 */
var PlayState = function(game) {
    // Difficulty
    this.difficulty = game.level * game.config.difficultyMultiplier;

    // Game entities
    this.ship = null;
    this.rockets = [];
    this.invaders = [];
    this.bombs = [];
};

/**
 * Enter the game state, creating the ship and invaders
 * @param  {Game} game
 */
PlayState.prototype.enter = function(game) {
    this.ship = new Ship(game.bounds.right/2, game.bounds.bottom, game.config.shipSpeed);
    this.invaders = createInvaders(
        game.config.invaderColumns,
        game.config.invaderRows,
        this.difficultyMultiplier(game.config.invaderVelocity)
    );

    /**
     * Create invaders for the columns and rows
     * @param {Number} columns
     * @param {Number} rows
     * @param {Number} velocity
     */
    function createInvaders(columns, rows, velocity) {
        var invaders = [],
            column, row, x, y;

        for (column = 0; column < columns; column++) {
            for (row = 0; row < rows; row++) {
                x = column * 5;
                y = 2 + row * 2;
                invaders.push(new Invader(x, y, velocity, column, row));
            }
        }

        return invaders;
    }
}

/**
 * Makes things more difficult as the levels increase
 * @param  {Number} value
 * @return {Number} increased with difficulty
 */
PlayState.prototype.difficultyMultiplier = function(value) {
    return value + (this.difficulty * value);
};

/**
 * Update all of the game pieces on screen and register play
 * @param  {Game} game
 * @param  {Number} delta
 */
PlayState.prototype.update = function(game, delta) {
    var i = 0,
        rocket,
        invader;

    // Move the ship, fire rocket and check for damage
    moveShip(game, this.ship);
    if (entityHit(this.ship, this.bombs)) {
        game.lives -= 1;
    }
    if (game.pressedKeys[game.keys.fire]) {
        fireRocket(game, this.ship, this.rockets);
    }

    // Move each rocket, if it returns false the rocket should be removed
    for (i = 0; i < this.rockets.length; i++) {
        if (!moveRocket(game, this.rockets[i])) {
            this.rockets.splice(i, 1);
        }
    }

    // Move the invaders and give them a chance of launching a bomb and be hit
    for (i = 0; i < this.invaders.length; i++) {
        moveInvader(game, this.invaders[i]);
        dropBomb(game, this.invaders[i], this.bombs);
        if (entityHit(this.invaders[i], this.rockets)) {
            this.invaders.splice(i, 1);
            game.score += game.config.invaderPoints;
        }
    }

    // Move the bombs, if it returns false the bomb should be removed
    for (i = 0; i < this.bombs.length; i++) {
        if (!moveBomb(game, this.bombs[i])) {
            this.bombs.splice(i, 1);
        }
    }

    // Next Level
    if (this.invaders.length === 0) {
        game.score += game.level * 50;
        game.level += 1;
        game.moveToState(new LevelIntroState(game));
    }

    // Game Over
    if (game.lives <= 0) {
        game.moveToState(new GameOverState(game));
    }

    /**
     * Move the ship, will limit to the bounds
     * @param  {Object} game
     * @param  {Entity} ship
     */
    function moveShip(game, ship) {
        // Move the ship
        if (game.pressedKeys[game.keys.left]) {
            ship.x -= ship.velocity * delta;
        }
        if (game.pressedKeys[game.keys.right]) {
            ship.x += ship.velocity * delta;
        }

        // Limit ship to the bounds
        if (ship.x < game.bounds.left) {
            ship.x = game.bounds.left;
        }
        if (ship.x + ship.width > game.bounds.right) {
            ship.x = game.bounds.right - ship.width;
        }
    }

    /**
     * Move the invader,
     * if the edges are hit they will desend
     * if the bottom is hit you die
     * @param  {Object} game
     * @param  {Entity} invader
     */
    function moveInvader(game, invader) {
        invader.x += invader.velocity * delta;

        // If the invader has hit the side drop down and reverse
        if (invader.x < game.bounds.left) {
            invader.x = game.bounds.left;
            invader.y += 1;
            invader.velocity *= -1;
        }
        if ((invader.x + invader.width) > game.bounds.right) {
            invader.x = game.bounds.right - invader.width;
            invader.y += 1;
            invader.velocity *= -1;
        }

        // Invaders have landed
        if (invader.y > game.bounds.bottom) {
            game.lives = 0;
        }
    }

    /**
     * Move the rocket and return false if out of bounds
     * @param  {Object} game
     * @param  {Entity} rocket
     * @return {Boolean}
     */
    function moveRocket(game, rocket) {
        rocket.y -= delta * rocket.velocity;
        if (rocket.y < game.bounds.top) {
            return false;
        }
        return true;
    }

    /**
     * Move the bomb, return false if out of bounds
     * @param  {Object} game
     * @param  {Entity} bomb
     * @return {Boolean}
     */
    function moveBomb(game, bomb) {
        bomb.y += delta * bomb.velocity;
        if (bomb.y > game.bounds.bottom + 1) {
            return false;
        }
        return true;
    }

    /**
     * Fire a rocket from the ship, does fire rate check
     * @param  {Object} game
     * @param  {Entity} ship
     * @param  {Array<Entity>} rockets
     */
    function fireRocket(game, ship, rockets) {
        var lastRocket = rockets[rockets.length - 1],
            rate = (1000 / game.config.rocketMaxFireRate),
            now = (new Date()).valueOf();

        if (!lastRocket || (now - lastRocket.fired) > rate) {
            rockets.push(new Rocket(ship.center(), ship.y, game.config.rocketVelocity, now));
        }
    }

    /**
     * Gives the invader a random chance of dropping a bomb
     * @param  {Object} game
     * @param  {Entity} invader
     * @param  {Array<Entity>} bombs
     */
    function dropBomb(game, invader, bombs) {
        var random = Math.random(),
            chance = game.config.bombRate * delta,
            max = game.config.bombMaxVelocity,
            min = game.config.bombMinVelocity;

        if (chance > random) {
            bombs.push(new Bomb(invader.x, invader.y, (random * (max - min + 1) + min)));
        }
    }

    /**
     * Check if an entity has been hit by any of the attacker entities
     * @param  {Entity} victim
     * @param  {Array<Entity>} attackers
     */
    function entityHit(victim, attackers) {
        var i;

        for (i = 0; i < attackers.length; i++) {
            if (attackers[i].hit(victim)) {
                attackers.splice(i, 1);
                return true;
            }
        }
        return false;
    }
}

/**
 * Draw the the game characters to the screen
 * @param {Game} game
 */
PlayState.prototype.draw = function(game) {
    var i = 0;

    game.clear();
    game.draw(1, 0, 'Level ' + game.level + ' - Lives ' + game.lives + ' - Score ' + game.score);
    this.ship.draw(game);
    for (i = 0; i < this.rockets.length; i++) {
        this.rockets[i].draw(game);
    }
    for (i = 0; i < this.invaders.length; i++) {
        this.invaders[i].draw(game);
    }
    for (i = 0; i < this.bombs.length; i++) {
        this.bombs[i].draw(game);
    }
}

/**
 * When the game is over and no lives are left show this state
 */
var GameOverState = function(game) {};

/**
 * Draw the message to the user how to restart
 * @param {Game} game
 */
GameOverState.prototype.draw = function(game) {
    game.clear();
    game.drawCenter('Game Over, Press "Escape" to restart');
};

/**
 * Listen to the key up and reset on the correct code
 * @param {Game} game
 * @param {Number} keyCode
 */
GameOverState.prototype.keyUp = function(game, keyCode) {
    if (keyCode === game.keys.restart) {
        game.reset();
    }
}

/**
 * Game entity object which entities inherit
 */
var Entity = function() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.string = '';
};

/**
 * Check to see if this entity has been hit by any others
 * @param  {Entity} entity
 * @return {Boolean}
 */
Entity.prototype.hit = function(entity) {
    if (this.x >= entity.x && this.x <= (entity.x + entity.width) &&
        this.y >= entity.y && this.y <= (entity.y + entity.height)) {
        return true;
    }
    return false;
};

/**
 * Return the sprite used for the entity
 * @param {String} char
 * @return {String}
 */
Entity.prototype.sprite = function(char) {
    if (!this.string) {
        this.string = Array(this.width+1).join(char);
    }
    return this.string
};

/**
 * Draw the entity to the game state
 * @param {Game} game
 */
Entity.prototype.draw = function(game) {
    var i = 0,
        sprite = this.sprite(game.characters[this.type]);

    for (i = 0; i < this.height; i++) {
        game.draw(this.x, this.y + i, sprite);
    }
};

/**
 * Return the center of the ship
 * @return {Number}
 */
Entity.prototype.center = function() {
    if (this.width > 1) {
        return this.x + (this.width/2);
    }
    return this.x;
};

/**
 * Ship game entity
 * @param {Number} x
 * @param {Number} y
 * @param {Number} velocity
 */
var Ship = function (x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
    this.width = 1;
    this.height = 1;
    this.type = 'ship';
};
Ship.prototype = Object.create(Entity.prototype);

/**
 * Rocket game entity
 * @param {Number} x
 * @param {Number} y
 * @param {Number} velocity
 * @param {Number} fired
 */
var Rocket = function (x, y, velocity, fired) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
    this.width = 1;
    this.height = 1;
    this.type = 'rocket';
    this.fired = fired;
};
Rocket.prototype = Object.create(Entity.prototype);

/**
 * Invader game entity
 * @param {Number} x
 * @param {Number} y
 * @param {Number} velocity
 * @param {Number} column
 * @param {Number} row
 */
var Invader = function(x, y, velocity, column, row) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
    this.column = column;
    this.row = row;
    this.width = 1;
    this.height = 1;
    this.type = 'invader';
};
Invader.prototype = Object.create(Entity.prototype);

/**
 * Bomb game entity
 * @param {Number} x
 * @param {Number} y
 * @param {Number} velocity
 */
var Bomb = function(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
    this.width = 1;
    this.height = 1;
    this.type = 'bomb';
};
Bomb.prototype = Object.create(Entity.prototype);
