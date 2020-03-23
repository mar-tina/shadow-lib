const parseRange = document.createRange();
const parse = Range.prototype.createContextualFragment.bind(parseRange);

export let initApp = (id, content, doc) => {
  let entrydiv = document.createElement("div");
  entrydiv.innerHTML = content();
  let docref = doc.body.querySelector(id);
  docref.appendChild(entrydiv);
};

export function Shadow(label, args) {
  let VDomNodes = {};
  customElements.define(
    label,
    class extends HTMLElement {
      connectedCallback() {
        !!args.onMount ? args.onMount() : {};

        this.render();
      }
      constructor() {
        super();
        this.BindNodes = {};
        this._shadowRoot = this.attachShadow({
          mode: "open"
        });
        this.parsedTemplate = parse(args.template(this));
        this.template = document.createElement("div");
        this.template.appendChild(this.parsedTemplate);
        !!args.getInitialState
          ? ([this.state, this.setState] = args.getInitialState(this))
          : {};
      }

      render() {
        this._shadowRoot.appendChild(this.template.cloneNode(true));
        recursivelyCheckForNodes(this._shadowRoot, VDomNodes);
        this.setAttributes();
      }

      clear() {
        for (var i = 0; i < this._shadowRoot.childNodes.length; i++) {
          this._shadowRoot.removeChild(this.shadowRoot.childNodes[i]);
        }
      }

      setAttributes() {
        for (var key in VDomNodes) {
          if (VDomNodes.hasOwnProperty(key)) {
            if (VDomNodes[key].parent != undefined) {
              // Get element in template and modify element
              let el = this._shadowRoot.querySelector(`#${key}`);
              let attr;
              !!el ? (attr = el.attributes) : (attr = {});
              for (var prop in attr) {
                if (attr[prop].nodeName != null) {
                  if (attr[prop].nodeName.startsWith("@")) {
                    let f = args.methods[`${attr[prop].nodeValue}`];
                    attr[prop].nodeName === "@bind"
                      ? setBindNodes(el, attr[prop].nodeValue, this.BindNodes)
                      : el.addEventListener(
                          `${attr[prop].nodeName.substr(1)}`,
                          e => f(e, this)
                        );
                    // el.removeAttribute(`${attr[prop].nodeName}`);
                  }
                }
              }
            }
          }
        }
      }
    }
  );

  return args.template;
}

/**
 *
 * @param {*} node -> The node with the bind attribute
 * @param {*} stateValue -> The state value the node is bound to
 * @param {*} bindNodes -> The object holding all the bind nodes
 */
function setBindNodes(node, stateValue, bindNodes) {
  !bindNodes.hasOwnProperty(`${stateValue}`)
    ? (bindNodes[`${stateValue}`] = {
        nodes: []
      })
    : {};

  bindNodes[`${stateValue}`][`nodes`].push(node);
}

function recursivelyCheckForNodes(node, allNodes) {
  let DomNode = {};
  node.id == "" ? (node.id = randStr() + uuid(8)) : {};
  DomNode[`${node.id}`] = {};

  !allNodes.hasOwnProperty(Object.keys(DomNode)[0])
    ? (allNodes[`${Object.keys(DomNode)[0]}`] = {})
    : {};

  allNodes[`${Object.keys(DomNode)[0]}`][`parent`] = node.parentNode;
  allNodes[`${Object.keys(DomNode)[0]}`][`attributes`] = node.attributes;

  if (node.hasChildNodes() == true) {
    for (var i = 0; i < node.children.length; i++) {
      recursivelyCheckForNodes(node.children[i], allNodes);
    }
  }
}

/*** HOOK-ALIKE Implementation */
export function useState(state, ctx) {
  const handler = {
    get(target, property, receiver) {
      return Reflect.get(target, property, receiver);
    },

    set(target, property, value, receiver) {
      return Reflect.set(target, property, value);
    }
  };
  let proxyObject = new Proxy(state, handler);
  let setState = createStateHandler(proxyObject, ctx);
  return [state, setState];
}

let bindState = (target, value) => {
  target.innerText = value;
};

/**
 *
 * @param {*} proxy -> The proxy object watching state
 * @param {*} self -> The execution context for the component. 'this'
 */
let createStateHandler = (proxy, self) => (state, rerender) => {
  for (var key in proxy) {
    if (state.hasOwnProperty(key)) {
      proxy[key] = state[key];
      // if rerender is set to true the element is cleared and re-rendered
      if (rerender) {
        self.clear();
        self.render();
      }
      //If false. Iterate through bind nodes. If there is a node that is bound to the current changing state execute bindState.
      //bindState only rerenders the elements bound to the changing state
      for (var node in self.BindNodes[`${key}`].nodes) {
        bindState(self.BindNodes[`${key}`].nodes[node], state[`${key}`]);
      }
    }
  }
};

function randStr() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 5);
}

// A package by: lukeed Github Repository link: https://github.com/lukeed/uid/blob/master/src/index.js
var IDX = 36,
  HEX = "";
while (IDX--) HEX += IDX.toString(36);

function uuid(len) {
  var str = "",
    num = len || 11;
  while (num--) str += HEX[(Math.random() * 36) | 0];
  return str;
}
