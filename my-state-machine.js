class MachineStack {
  constructor() {
    this.stack = [];
    this.length = 0;
  }

  push(value) {
    this.stack.push(value);
    this.length++;
  }

  pop() {
    if (this.isEmpty()) {
      throw new Error("Stack is empty");
    }
    this.length--;
    return this.stack.pop();
  }

  isEmpty() {
    return this.length === 0;
  }

  getTopElement() {
    if (this.isEmpty()) {
      throw new Error("Stack is empty");
    }
    return this.stack[this.length - 1];
  }
}

class StateMachine {
  constructor(config) {
    this.id = config.id;
    this.context = config.context;
    this.currentState = config.initialState;
    this.states = config.states;
    this.actions = config.actions;
  }

  transition(event, data) {
    const machineCurrentState = this.states[this.currentState];
    const handledEvent = machineCurrentState.on[event];
    if (!handledEvent) {
      throw new Error(`Event ${event} for state` +
        ` ${this.currentState}  doesn't exists`);
    }
    return Promise.resolve(this)
      .then(() => {
        if (machineCurrentState.hasOwnProperty('onExit')) {
          this.callActions("onExit", data)
        }
      })
      .then(() => {
        const service = handledEvent["service"];
        if (service) {
          this.callService(service, data)
        } else {
          let targetState = this.getTargetState(handledEvent);
          this.setState(targetState);
        }
        return this;
      })
      .catch((error) => {
        throw error;
      })
  }

  getTargetState(handledEvent) {
    if (handledEvent.hasOwnProperty("target")) {
      return handledEvent["target"];
    } else {
      throw new Error(`Target state for machine` + ` ${this.id} is not specified.`);
    }
  }

  setContext(newContext) {
    Object.assign(this.context, newContext);
  }

  setState(targetState) {
    if (!this.states.hasOwnProperty(targetState)) {
      throw new Error(`Target state "${targetState}"` +
        ` for machine ${this.id} is incorrect.`);
    }
    this.currentState = targetState;
    if (this.states[targetState].hasOwnProperty("onEntry")) {
      this.callActions("onEntry");
    }
  }

  getActionByItsName(actionName) {
    if (!this.actions.hasOwnProperty(actionName)) {
      throw new Error(`Action "${action}" is unavailable`);
    }
    return this.actions[actionName];
  }


  callService(service, data) {
    StateMachine.machinesStack.push(this);
    service(data);
    StateMachine.machinesStack.pop();
  }


  callActions(actionName, data) {
    const actionsForCall = [];
    const action = this.states[this.currentState][actionName];
    if (typeof action == "string") {
      actionsForCall.push(this.getActionByItsName(action))
    } else if (typeof action == "function") {
      actionsForCall.push(action)
    } else {
      for (let act of action) {
        if (typeof act == "function") {
          actionsForCall.push(act)
        } else if (typeof act == "string") {
          actionsForCall.push(this.getActionByItsName(act));
        }
      }
    }
    for (let func of actionsForCall) {
      StateMachine.machinesStack.push(this);
      func(data);
      StateMachine.machinesStack.pop();
    }
  }
}

StateMachine.machinesStack = new MachineStack();

function machine(config) {
  return new StateMachine(config);
}

function useContext() {
  let machine = StateMachine.machinesStack.getTopElement();
  return [machine.context, arg => machine.setContext(arg)]
}

function useState() {
  let machine = StateMachine.machinesStack.getTopElement();
  return [machine.currentState, (arg) => machine.setState(arg)]
}