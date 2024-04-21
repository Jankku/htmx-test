const express = require("express");
const Mustache = require("mustache");
const { WebSocket, WebSocketServer } = require("ws");
const { createTodo, loadTemplate, loadPartial, wait } = require("./util");

const PORT = 3000;

const app = express();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "mustache");

const templates = {
  index: loadTemplate("index"),
  home: loadTemplate("home"),
  chat: loadTemplate("chat"),
  about: loadTemplate("about"),
};

const partials = {
  nav: loadPartial("nav"),
  error: loadPartial("error"),
  todoList: loadPartial("todolist"),
  todo: loadPartial("todo"),
  messageList: loadPartial("messagelist"),
  message: loadPartial("message"),
};

const store = {
  todos: [],
  messages: [],
};

app.use("/loaders", express.static("loaders"));

app.use((req, res, next) => {
  res.locals.useLayout = req.headers["hx-request"] !== "true";
  next();
});

app.get("/", (_, res) => {
  const output = Mustache.render(
    templates.index,
    { useLayout: res.locals.useLayout, todos: store.todos },
    {
      nav: partials.nav,
      main: templates.home,
      todoList: partials.todoList,
      todo: partials.todo,
    }
  );

  res.header("Content-Type", "text/html");
  res.send(output);
});

app.get("/chat", (_, res) => {
  const output = Mustache.render(
    templates.index,
    {
      useLayout: res.locals.useLayout,
      messages: store.messages,
    },
    {
      nav: partials.nav,
      main: templates.chat,
      messagelist: partials.messageList,
    }
  );

  res.header("Content-Type", "text/html");
  res.send(output);
});

app.get("/about", (_, res) => {
  const output = Mustache.render(
    templates.index,
    {
      useLayout: res.locals.useLayout,
      date: Intl.DateTimeFormat("fi", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date()),
    },
    {
      nav: partials.nav,
      main: templates.about,
    }
  );

  res.header("Content-Type", "text/html");
  res.send(output);
});

app.post("/add", async (req, res) => {
  await wait(500);
  store.todos.push(createTodo(req.body.text || "-"));

  const output = Mustache.render(
    partials.todoList,
    { todos: store.todos },
    { todo: partials.todo }
  );

  res.header("Content-Type", "text/html");
  res.send(output);
});

app.delete("/delete/:id", (req, res) => {
  const index = store.todos.findIndex((todo) => todo.id === req.params.id);

  if (index > -1) {
    store.todos.splice(index, 1);
  }

  const output = Mustache.render(
    partials.todoList,
    { todos: store.todos },
    { todo: partials.todo }
  );

  res.header("Content-Type", "text/html");
  res.send(output);
});

const server = app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: "/ws" });

app.all("/ws", (req, _) => {
  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss.emit("connection", ws, req);
  });
});

// 404 handler
app.use((req, res, next) => {
  const output = Mustache.render(templates.index, {}, { main: partials.error });
  res.header("Content-Type", "text/html");
  res.status(404);
  res.send(output);
});

// Error handler
app.use((err, _, res, next) => {
  console.error(err.stack);
  const output = Mustache.render(templates.index, {}, { main: partials.error });

  res.header("Content-Type", "text/html");
  res.status(500);
  res.send(output);
});

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`WebSocket connection opened [${ip}]`);

  ws.on("close", () => console.log(`WebSocket connection closed [${ip}]`));
  ws.on("error", (error) => console.error(`WebSocket error [${ip}]: ${error}`));

  ws.on("message", (rawMessage) => {
    const { name, message } = JSON.parse(rawMessage);
    if (!name || !message) return;

    store.messages.push({ name, message });

    console.log(`Received message [${ip}] => ${message}`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          Mustache.render(
            partials.messageList,
            { messages: store.messages },
            { message: partials.message }
          ),
          {
            binary: false,
            compress: false,
          }
        );
      }
    });
  });
});
