//TODO: create an API to expose upgrade etc. functions

let config = require("./config.json");

class Universe {
  constructor(config) {
    this.config = config;

    this.players = {};
  }

  static get TICK_LENGTH() { return 1000; }
  static get TICK_LENGTH_IN_HOURS() { return Universe.TICK_LENGTH / 1000 / 3600; }

  run() {
    setInterval(() => {this.tick();},Universe.TICK_LENGTH);
  }

  addPlayer(name) {
    this.players[name] = new Player(name,this.config.buildingTypes,this.config.params);
  }

  tick() {
    for (let player of Object.values(this.players)) {
      player.tick();
    }
  }
}

class Player {
  constructor(name,buildingTypes,params) {
    this.name = name;

    this.buildings     = {};
    this.buildingTypes = buildingTypes;

    this.defaultResourceRate = params.defaultResourceRate;
    this.resources           = params.startingResources;

    this.energyOutput  = 0;
    this.energyBalance = 0;
  }

  canAfford(costs) {
    for (let resource in costs) {
      if (costs[resource]>this.resources[resource]) {
        return false;
      }
    }

    return true;
  }

  pay(costs) {
    if (!this.canAfford(costs)) {
      throw new Error("Can\'t afford that");
    } else {
      for (let resource in costs) {
        this.resources[resource] -= costs[resource];
      }
    }
  }

  upgrade(buildingType) {
    if (this.buildings[buildingType]) {
      let building = this.buildings[buildingType];
      let cost     = building.upgradeCost();

      this.pay(cost);
      building.upgrade();
    } else {
      this.pay(this.buildingTypes[buildingType].cost.initial);
      this.buildings[buildingType] = new Building(this.buildingTypes[buildingType],this);
    }
  }

  tick() {
    console.log(this.resources);
    console.log(this.energyBalance);

    for (let resource in this.defaultResourceRate) {
      this.resources[resource] += this.defaultResourceRate[resource] * Universe.TICK_LENGTH_IN_HOURS;
    }

    for (let buildingType in this.buildings) {
      this.buildings[buildingType].tick();
    }
  }
}

class Building {
  constructor(buildingType,player) {
    this.buildingType = buildingType;
    this.player       = player;
    this.level        = 1;

    this.energy = 0;
    this.adjustEnergy();
  }

  upgrade() {
    this.level++;

    this.adjustEnergy();
  }

  adjustEnergy() {
    if (this.buildingType.energy) {
      if (this.buildingType.energy.initial>0) {
        this.player.energyOutput -= this.energy;
      }

      this.player.energyBalance -= this.energy;
      this.energy           = this.buildingType.energy.initial * this.level * Math.pow(this.buildingType.energy.base,this.level);
      this.player.energyBalance += this.energy;

      if (this.buildingType.energy.initial>0) {
        this.player.energyOutput += this.energy;
      }
    }
  }

  upgradeCost() {
    let initial = this.buildingType.cost.initial;
    let base    = this.buildingType.cost.base;

    let cost = {};
    for (let resource in initial) {
      cost[resource] = initial[resource] * Math.pow(base,this.level-1);
    }

    return cost;
  }

  rateDelta() {
    let initial = this.buildingType.income.initial;
    let base    = this.buildingType.income.base;

    let oldSum = 0;
    if (this.level!=1) {
      oldSum = initial * this.level * Math.pow(base,this.level-1);
    }
    let newSum = this.rate();

    return newSum - oldSum;
  }

  energyDelta() {
    let initial = this.buildingType.energy.initial;
    let base    = this.buildingType.energy.base;

    let oldSum = 0;
    if (this.level!=1) {
      oldSum = initial * this.level * Math.pow(base,this.level-1);
    }
    let newSum = this.energy;

    return newSum - oldSum;
  }

  //if the energy balance is negative, energy is shared between buildings evenly in proportion to their proportional positive-balance consumption
  //e.g. if a building makes up 10% of energy consumption and energy balance is negative, 10% of energy output will be alotted to it
  rateEnergyFactor() {
    let availableEnergyFraction = 1.0;

    if (this.player.energyOutput==0) {
      availableEnergyFraction = 0;
    } else if (this.player.energyBalance < 0) {
      availableEnergyFraction = this.player.energyOutput / (this.player.energyOutput + (-1)*this.player.energyBalance);
    }

    return availableEnergyFraction;
  }

  rate() {
    let initial = this.buildingType.income.initial;
    let base    = this.buildingType.income.base;

    //console.log(initial);
    //console.log(base);

    let rates = {};
    for (let resource in initial) {
      rates[resource] = initial[resource] * this.level * Math.pow(base,this.level) * this.rateEnergyFactor();
    }

    //console.log(this.rateEnergyFactor());

    return rates;
  }

  tick() {
    if (this.buildingType.income) {
      console.log(this.rate());
      let resourceRates = this.rate();
      for (let resource in resourceRates) {
        this.player.resources[resource] += resourceRates[resource] * Universe.TICK_LENGTH_IN_HOURS;
      }
    }
  }
}

let universe = new Universe(config);
universe.run();
universe.addPlayer("test");
universe.players.test.upgrade("Solar Plant");
universe.players.test.upgrade("Metal Mine");
universe.players.test.upgrade("Metal Mine");
universe.players.test.upgrade("Solar Plant");
universe.players.test.upgrade("Metal Mine");
