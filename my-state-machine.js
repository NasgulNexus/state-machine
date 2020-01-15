class stack {
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
  constructor(description) {
    this.id = description.id;
    this.currentState = description.initialState;
    this.context = description.context;
    this.states = description.states;
    this.actions = description.actions;
  }

  transition(event, data) {
    const statusMachine = this.states[this.currentState];
    const evently = statusMachine.on[event];
    if (!evently) {
      throw new Error('Error event');
    }
    return Promise.resolve(this)
      .then(() => {
        if (statusMachine.hasOwnProperty('onExit')) {
          this.callActions("onExit", data)
        }
      })
      .then(() => {
        const service = evently["service"];
        if (service) {
          this.callService(service, data)
        } else {
          let targetState = this.targetState(evently);
          this.setState(targetState);
        }
        return this;
      })
      .catch((error) => {
        throw error;
      })
  }

  targetState(evently) {
    if (evently.hasOwnProperty("target")) {
      return evently["target"];
    } else {
      throw new Error('Target Eroor');
    }
  }

  setState(targetState) {
    if (!this.states.hasOwnProperty(targetState)) {
      throw new Error("Target state Error");
    }
    this.currentState = targetState;
    if (this.states[targetState].hasOwnProperty("onEntry")) {
      this.callActions("onEntry");
    }
  }

  setContext(newContext) {
    Object.assign(this.context, newContext);
  }

  callActions(actionName, data) {
    const actionsForCall = [];
    const action = this.states[this.currentState][actionName];
    if (typeof action == "string") {
      actionsForCall.push(this.funcActionName(action))
    } else if (typeof action == "function") {
      actionsForCall.push(action)
    } else {
      for (let act of action) {
        if (typeof act == "function") {
          actionsForCall.push(act)
        } else if (typeof act == "string") {
          actionsForCall.push(this.funcActionName(act));
        }
      }
    }
    for (let func of actionsForCall) {
      StateMachine.machinesStack.push(this);
      func(data);
      StateMachine.machinesStack.pop();
    }
  }

  funcActionName(actionName) {
    if (!this.actions.hasOwnProperty(actionName)) {
      throw new Error("Action Error");
    }
    return this.actions[actionName];
  }

  callService(service, data) {
    StateMachine.machinesStack.push(this);
    service(data);
    StateMachine.machinesStack.pop();
  }
}

function machine(description) {
  return new StateMachine(description);
}

StateMachine.machinesStack = new stack();

function useContext() {
  let machine = StateMachine.machinesStack.getTopElement();
  return [machine.context, arg => machine.setContext(arg)]
}

function useState() {
  let machine = StateMachine.machinesStack.getTopElement();
  return [machine.currentState, (arg) => machine.setState(arg)]
}

// machine — создает инстанс state machine (фабрика)
const vacancyMachine = machine({
  // У каждого может быть свой id
  id: "vacancy",
  // начальное состояние
  initialState: "notResponded",
  // дополнительный контекст (payload)
  context: { id: 123 },
  // Граф состояний и переходов между ними
  states: {
    // Каждое поле — это возможное состоение
    responded: {
      // action, который нужно выполнить при входе в это состояние. Можно задавать массивом, строкой или функцией
      onEntry: "onStateEntry"
    },
    notResponded: {
      // action, который нужно выполнить при выходе из этого состояния. Можно задавать массивом, строкой или функцией
      onExit() {
        console.log("we are leaving notResponded state");
      },
      // Блок описания транзакций
      on: {
        // Транзакция
        RESPOND: {
          // упрощенный сервис, вызываем при транзакции
          service: event => {
            // Позволяет получить текущий контекст и изменить его
            const [contex, setContext] = useContext();
            // Позволяет получить текущий стейт и изменить его
            const [state, setState] = useState();
            // Поддерживаются асинхронные действия
            Promise.resolve("result").then(() => {
              // меняем состояние
              //     console.log("In promise");
              setState('responded');
              // Мержим контекст
              setContext({ completed: true }); // {id: 123, comleted: true}
            });
          }
          // Если не задан сервис, то просто переводим в заданный target, иначе выполняем сервис.
          //target: 'responded',
        }
      }
    }
  },
  // Раздел описание экшенов
  actions: {
    onStateEntry: function (event) {
      const [state] = useState();
      console.log("now state is " + state);
    }
    /*makeResponse: (event) => {
			// both sync and async actions
			const [contex, setContext] = useContext()			
			window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} })
		}*/
  }
});

// Пример использования StateMachine
vacancyMachine.transition("RESPOND", {
  resume: { name: "Vasya", lastName: "Pupkin" }
});
// vacancyMachine.transition('RESPONDA', {resume: {name: 'Vasya', lastName: 'Pupkin'}});
setTimeout(() => console.log("Final vacancy machine: ", vacancyMachine), 0);
