import { Store } from './store'
import { linkEvent, Component, render } from 'inferno'

function createRows(store, deleteFunc, selectFunc) {
  const rows = [];
  const data = store.data;
  const selected = store.selected;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const id = d.id;

    rows.push(
      <tr key={id} className={id === selected ? 'danger' : null}>
        <td className="col-md-1" $HasTextChildren>{id}</td>
        <td className="col-md-4">
          <a onClick={linkEvent(id, selectFunc)} $HasTextChildren>{d.label}</a>
        </td>
        <td className="col-md-1">
          <a onClick={linkEvent(id, deleteFunc)}>
            <span className="glyphicon glyphicon-remove" aria-hidden="true"/>
          </a>
        </td>
        <td className="col-md-6"/>
      </tr>
    );
  }

  return rows;
}

export class Controller extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = { store: new Store() };
    this.select = this.select.bind(this);
    this.delete = this.delete.bind(this);
    this.add = this.add.bind(this);
    this.run = this.run.bind(this);
    this.update = this.update.bind(this);
    this.runLots = this.runLots.bind(this);
    this.clear = this.clear.bind(this);
    this.swapRows = this.swapRows.bind(this);
    this.start = 0;
  }

  run(event) {
    event.stopPropagation();
    this.state.store.run();
    this.setState({ store: this.state.store });
  }

  add(event) {
    event.stopPropagation();
    this.state.store.add();
    this.setState({ store: this.state.store });
  }

  update(event) {
    event.stopPropagation();
    this.state.store.update();
    this.setState({ store: this.state.store });
  }

  select(id, event) {
    event.stopPropagation();
    this.state.store.select(id);
    this.setState({ store: this.state.store });
  }

  delete(id, event) {
    event.stopPropagation();
    this.state.store.delete(id);
    this.setState({ store: this.state.store });
  }

  runLots(event) {
    event.stopPropagation();
    this.state.store.runLots();
    this.setState({ store: this.state.store });
  }

  clear(event) {
    event.stopPropagation();
    this.state.store.clear();
    this.setState({ store: this.state.store });
  }

  swapRows(event) {
    event.stopPropagation();
    this.state.store.swapRows();
    this.setState({ store: this.state.store });
  }

  render() {
    return (
      <div className="container">
        <div className="jumbotron">
          <div className="row">
            <div className="col-md-6">
              <h1>Inferno</h1>
            </div>
            <div className="col-md-6">
              <div className="row">
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="run" onClick={this.run}>Create 1,000
                    rows
                  </button>
                </div>
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="runlots" onClick={this.runLots}>Create
                    10,000 rows
                  </button>
                </div>
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="add" onClick={this.add}>Append 1,000
                    rows
                  </button>
                </div>
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="update" onClick={this.update}>Update
                    every 10th row
                  </button>
                </div>
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="clear" onClick={this.clear}>Clear
                  </button>
                </div>
                <div className="col-sm-6 smallpad">
                  <button type="button" className="btn btn-primary btn-block" id="swaprows" onClick={this.swapRows}>Swap
                    Rows
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <table className="table table-hover table-striped test-data">
          <tbody $HasKeyedChildren>
            {createRows(this.state.store, this.delete, this.select)}
          </tbody>
        </table>
        <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true"/>
      </div>
    );
  }
}

render(<Controller/>, document.getElementById("main"));
