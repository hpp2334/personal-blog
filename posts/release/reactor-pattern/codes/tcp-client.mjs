import net from "net";
import cluster from "cluster";

const config = {
  parallelism: 10,
};

if (cluster.isPrimary) {
  for (let i = 0; i < config.parallelism; i++) {
    cluster.fork();
  }
} else {
  let n = 100;
  let closed_num = 0;
  for (let i = 0; i < n; i++) {
    const client = new net.Socket();
    client.connect(3001, "127.0.0.1", function () {
      console.log(`process ${process.pid} connected`);
      client.write(`[process ${process.pid}](${i}) message 1\n`);
      client.write(`[process ${process.pid}](${i}) message 2\n`);
      client.end();
    });

    client.on("data", function (data) {
      console.log(data.toString());
    });

    client.on("error", function (err) {
      console.log(err);
    });

    client.on("close", function () {
      closed_num += 1;
      if (closed_num === n) {
        process.exit();
      }
    });
  }
}
