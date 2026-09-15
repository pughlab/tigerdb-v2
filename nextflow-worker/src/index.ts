import "dotenv/config"
import amqp, {ChannelWrapper} from "amqp-connection-manager";
import {startPipeline} from "./worker.ts";

export const connection = amqp.connect([`amqp://${process.env.RABBITMQ_USER!}:${process.env.RABBITMQ_PASSWORD!}@${process.env.RABBITMQ_HOST!}:${process.env.RABBITMQ_PORT!}`]);
connection.on("connect", () => {
    console.log("Connected to RabbitMQ");
});
connection.on("disconnect", (params) => {
    console.error("Disconnected from RabbitMQ", params.err);
});
const inputChannel: ChannelWrapper = connection.createChannel({
    json: true,
    setup: function (channel: any) {
        return Promise.all([
            channel.assertQueue(process.env.RABBITMQ_QUEUE, { durable: true }),
            channel.prefetch(1),
            channel.consume(process.env.RABBITMQ_QUEUE, (msg: any) => {
                if (msg !== null) {
                    console.log("Received message", msg.content.toString());
                    try {
                        const payload: {
                            workflowId: string;
                            bucketName: string;
                            paths: string[];
                            runId: string;
                            outPrefix: string;
                        } = JSON.parse(msg.content.toString());
                        console.log("Current payload is", payload);
                        startPipeline(payload);
                    } catch (error) {
                        console.error("Could not process the received message", error);
                    } finally {
                        channel.ack(msg);
                    }
                }
            })
        ])
    },
});

async function shutdown(signal: string) {
    console.log(`Received signal ${signal}, shutting down...`);
    try {
        await inputChannel.close();
        console.log("Input channel closed");
        await connection.close();
        console.log("Connection closed");

        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));