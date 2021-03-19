import React, { Component, PureComponent } from 'react';
import produce from 'immer';

class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  update(updater) {
    const newState = produce(this.state, draft => {
      updater(draft);
    });
    if (newState && newState !== this.state) {
      this.state = newState;
      this.notify();
    }
  }
}

const store = new Store({
  saving: false,
  loading: false,
  todo: {
    title: '',
    done: false,
  },
  todos: [],
});

const fetchTodos = () => {
  store.update(draft => (draft.loading = true));
  // simulate async data fetch
  return new Promise(resolve => {
    setTimeout(() => {
      store.update(draft => {
        draft.todos = [
          { id: Math.random(), title: 'Hello...', done: false },
          { id: Math.random(), title: 'World...', done: false },
          { id: Math.random(), title: 'Hello World...', done: true },
        ];
        draft.loading = false;
        resolve();
      });
    }, 1000);
  });
};

const saveTodo = () => {
  store.update(draft => (draft.saving = true));
  // simulate async save
  return new Promise(resolve => {
    setTimeout(() => {
      store.update(draft => {
        const todo = draft.todo;
        if (!todo.id) {
          todo.id = Math.random();
          draft.todos.push(todo);
        } else {
          draft.todos = draft.todos.map(item => (item.id === todo.id ? todo : item));
        }
        draft.todo = { title: '', done: false };
        draft.saving = false;
        resolve();
      });
    }, 1000);
  });
};

const updateTodo = todo => {
  store.update(draft => {
    const current = (draft.todo = { ...draft.todo, ...todo });
    if (current.id) {
      draft.todos = draft.todos.map(item => (item.id === current.id ? current : item));
    }
  });
};

const removeTodo = todo => {
  store.update(draft => (draft.saving = true));
  // simulate async delete
  return new Promise(resolve => {
    setTimeout(
      () =>
        store.update(draft => {
          draft.todos = draft.todos.filter(item => item.id !== todo.id);
          draft.todo = { title: '', done: false };
          draft.saving = false;
        }),
      1000,
    );
  });
};

const selectTodo = todo => {
  store.update(draft => {
    draft.todo = todo;
  });
};

const { Provider, Consumer } = React.createContext();

const connect = selector => Comp => props => (
  <Consumer>
    {state => {
      const myProps = selector(state);
      return <Comp {...props} {...myProps} />;
    }}
  </Consumer>
);

class TodoItem extends PureComponent {
  render() {
    const { todo } = this.props;
    return (
      <li key={todo.id} onClick={e => selectTodo(todo)}>
        <input
          type="checkbox"
          checked={todo.done}
          onChange={e => updateTodo({ done: !todo.done })}
        />
        {todo.title}
      </li>
    );
  }
}

const TodoListComponent = ({ loading, todos, completed }) => {
  if (loading) return <div>Loading</div>;
  return (
    <React.Fragment>
      <ul>
        {todos.map(todo => (
          <TodoItem todo={todo} key={todo.id} />
        ))}
      </ul>
      <div>Completed: {completed}</div>
    </React.Fragment>
  );
};

const TodoList = connect(state => ({
  todos: state.todos,
  loading: state.loading,
  completed: state.todos.filter(item => item.done).length,
}))(TodoListComponent);

class TodoEditorComponent extends PureComponent {
  input = React.createRef();

  onSubmit = e => {
    e.preventDefault();
    saveTodo().then(() => {
      this.input.current.value = '';
      this.input.current.focus();
    });
  };

  render() {
    const { todo, saving, updateTodo, removeTodo } = this.props;
    return (
      <form onSubmit={this.onSubmit}>
        <input
          type="text"
          ref={this.input}
          disabled={saving}
          value={todo.title}
          onChange={e => updateTodo({ title: e.target.value })}
        />
        <button disabled={saving}>Add</button>
        {todo.id && (
          <button type="button" disabled={saving} onClick={e => removeTodo(todo)}>
            Delete
          </button>
        )}
      </form>
    );
  }
}

const TodoEditor = connect(state => ({
  todo: state.todo,
  saving: state.saving,
  updateTodo,
  removeTodo,
}))(TodoEditorComponent);

class TodoContainer extends Component {
  state = store.state;

  componentWillMount() {
    this.unsubscribe = store.subscribe(state => this.setState(state));
  }

  componentDidMount() {
    fetchTodos();
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return (
      <Provider value={this.state}>
        <div>
          <TodoEditor />
          <TodoList />
        </div>
      </Provider>
    );
  }
}

export default TodoContainer;