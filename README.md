
# Tachyon ⚡️

Simple, small, and flexible task scheduler for Deno, backed by MongoDB.

> NOTICE: This library is not 100% ready so use it with caution. 🙏

## Simple Usage

> You will also need a working Mongo database (v3) to point it to.

```ts
import { Tachyon } from "https://deno.land/x/tachyon@v0.10.0/mod.ts";

const tachyon = new Tachyon({
  maxConcurrency: 20,
  db: {
    uri: "mongodb://localhost:27017",
    name: "my-db",
    collection: "_tasks",
  }
});

tachyon.define("echo-date", () => {
  console.log(new Date());
});

await tachyon.start();
await tachyon.every(2000, "echo-date");
```

> The available config options can be found here: https://github.com/alexalikiotis/tachyon/blob/master/lib/types.ts#L13

## Methods

> Methods starting with a `$` are meant to be used internally by the runtime and not by the user !!!

### define(name, fn)
The `define` method lets you define the task function that the runtime will execute when called.

```ts
tachyon.define("echo-date", () => {
  console.log(new Date());
});
```

### start()
By using the `start` method you essentially start the task processing by the runtime. **(async)**

```ts
await tachyon.start();
```

> Top level await supported by Deno really gets handy here 🎉

### now(name, [data], [options])
The `now` method subscribes a task to runtime to run as soon as possible. **(async)**

```ts
tachion.define("print", ({ message }: any) => {
  console.log(message);
});

await achyon.now("print", { message: "Hello, Deno!" });
```

> For available **options** check here: https://github.com/alexalikiotis/tachyon/blob/master/lib/types.ts#L18

### every(interval, name, [data], [options])
The `every` method subscribes a recurring task to runtime's task queue. Keep in mind, interval supports only milliseconds for now. **(async)**

```ts
await tachyon.every(2000, "echo-date");
```

### schedule(cron, name, [data], [repeat], [options])
The `schedule` method allows you to create a task based on a cron syntax (repeated or not). **(async)**

```ts
await tachyon.schedule("* * * * *", "print", { message: "this is a cron based task!" });
```

> Timezones are not supported yet, but there coming eventually!

### create(name, [data], [options])
Although the recommended way to register tasks is with the `now`, `every` and `schedule` methods, there is also the option to create tasks manually. (cool thing is you can chain *`task methods`* using it)

```ts
// ONLY FOR ADVANCES USAGE

// create `raw` task
const task = create("send-email", "some@email.com")
  .interval("0 0 * * THU")
  .timeout(10000)
  .retries(2)
  .repeat(true);

await task.save(); // save task to queue
```

### stop()
Use the `stop` method if you want to gracefully shutdown the runtime.

```ts
tachyon.stop() // graceful shutdown
```

> *makes process-interval undefined and clears the task queue*

## Events

### ready
When the runtime will be ready for processing tasks will emit a `ready` event.

```ts
tachyon.on("ready", () => {
  console.log("tachyon runtime is ready now 🖖");
});
```

### start
When a task is ready to be executed the runtime will emit the start event with the task instance as a parameter.

```ts
tachyon.on("start", (task: Task) => {
  console.log(`task ${task.name} is about to run...`);
});
```

### start:[task]
With the generic `start` event that is emitted (for all tasks), the runtime will also emit a `start` event for the specific task.

```ts
tachyon.on("start:echo-date", (task: Task) => {
  console.log(`task ${task.name} is about to run...`);
});
```

### success
When a task is successfully runs the runtime will emit a `success` event with the task instance and the task's result as parameters.

```ts
tachyon.on("success", (task: Task, result: any) => {
  console.log(`task ${task.name}'s result is ${result}`);
});
```

### success:[task]
Following the pattern from the `start` event, the runtime will also emit a specific `success` for task.

```ts
tachyon.on("success:fetch-api", (task: Task, result: any) => {
  console.log(`API response is ${JSON.parse(result)}`);
});
```

### fail
When a task fails the runtime will emit an `fail` event. **(this is the recommended way to handle task errors)**

```ts
tachyon.on("fail", (task: Task, err: any) => {
  console.log(`task ${task.name} failed with error: ${err}`);
});
```

### fail:[task]
Once again there is also a specific task `fail` event. **(this is the recommended way to handle task errors)**

```ts
tachyon.on("fail:fetch-api", (task: Task, result: any) => {
  console.log(`can't fetch API: ${result}`);
});
```

### complete
After a task is run and completes (success / fail) the runtime will emit an `complete` event for clean up purposes.

```ts
tachyon.on("complete", (task: Task) => {
  console.log(`task ${task.name} completed 😎`);
});
```

### complete:[task]
It gets boring now but the runtime will also emit an `complete` event for targeted events. 

```ts
tachyon.on("complete:fetch-api", (task: Task) => {
  console.log(`task ${task.name} completed 😎`);
});
```

## Contributing
Pull requests are welcome; My free time is limited but I'll try to review them as soon as possible... ❤️

## License
<a href="https://github.com/alexalikiotis/tachyon/blob/master/LICENSE">The MIT License</a>