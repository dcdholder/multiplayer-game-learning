class Universe {
  constructor(config) {
    this.config = config;

    this.players = {};
  }

  static get MILLISECONDS_IN_HOUR() { return 60 * 60 * 1000; }

  static get TICK_LENGTH()          { return 1000; }
  static get TICK_LENGTH_IN_HOURS() { return Universe.TICK_LENGTH / Universe.MILLISECONDS_IN_HOUR; }

  addPlayer(name) {
    if (!this.players[name]) {
      this.players[name] = new Player(name,this.config.buildingTypes,this.config.params);
    } else {
      throw new Error("Player with that name already exists.");
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

    this.startBasicIncome();

    this.energyOutput  = 0;
    this.energyBalance = 0;
  }

  startBasicIncome() {
    setInterval(() => {this.receiveBasicIncome();}, Universe.TICK_LENGTH);
  }

  receiveBasicIncome() {
    for (let resource in this.defaultResourceRate) {
      this.resources[resource] += this.defaultResourceRate[resource] * Universe.TICK_LENGTH_IN_HOURS;
    }
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

      if (!building.upgrading) {
        building.upgrade();
      } else {
        throw new Error("Building already upgrading");
      }
    } else {
      this.pay(this.buildingTypes[buildingType].cost.initial);
      this.buildings[buildingType] = new Building(this.buildingTypes[buildingType],this);
    }
  }

  getBuildingLevels() {
    let buildingLevels = {};

    for (let buildingType in this.buildings) {
      buildingLevels[buildingType] = this.buildings[buildingType].level;
    }

    return buildingLevels;
  }

  getResourceRate() {
    let rates = this.defaultResourceRate;

    for (let buildingType in this.buildings) {
      let rate  = this.buildings[buildingType].rate();

      for (let resource in rate) {
        rates[resource] += rate[resource];
      }
    }

    return rates;
  }

  getState() {
    let state = {
      buildings:    this.getBuildingLevels(),
      resources:    this.resources,
      resourceRate: this.getResourceRate(),

      energyOutput:  this.energyOutput,
      energyBalance: this.energyBalance
    }

    return state;
  }
}

class Building {
  constructor(buildingType,player) {
    this.buildingType = buildingType;
    this.player       = player;
    this.level        = 0;

    this.upgrading = true;
    this.startUpgradeTimer();
    if (this.buildingType.income) {
      this.startMining();
    }

    this.energy = 0;
  }

  static get UPGRADE_TIME_DIVISOR() { return 2500; }

  startUpgradeTimer() {
    setTimeout(() => {this.upgrading=false; this.upgrade();}, this.constructionTime() * Universe.MILLISECONDS_IN_HOUR);
  }

  startMining() {
    setInterval(() => {this.givePlayerResources();}, Universe.TICK_LENGTH);
  }

  givePlayerResources() {
    let resourceRates = this.rate();
    for (let resource in resourceRates) {
      this.player.resources[resource] += resourceRates[resource] * Universe.TICK_LENGTH_IN_HOURS;
    }
  }

  upgrade() {
    this.level++;

    this.adjustEnergy();
  }

  //time returned in hours
  constructionTime() {
    let upgradeCost = this.upgradeCost();

    let metalCrystalCost = 0;
    for (let resource in upgradeCost) {
      if (resource=="metal" || resource=="crystal") {
        metalCrystalCost += upgradeCost[resource];
      }
    }

    let baseTime = metalCrystalCost / Building.UPGRADE_TIME_DIVISOR;

    return baseTime;
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
      cost[resource] = initial[resource];
      if (this.level!=0) {
        cost[resource] *= Math.pow(base,this.level-1);
      }
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

    let rates = {};
    if (this.level!=0) {
      for (let resource in initial) {
        rates[resource] = initial[resource] * this.level * Math.pow(base,this.level) * this.rateEnergyFactor();
      }
    }

    return rates;
  }
}

module.exports = Universe;
