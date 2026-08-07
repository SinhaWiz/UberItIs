package org.uber.notificationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Redeclares the exchange/queues that ride-service and payment-service already declare.
 * This is idempotent — RabbitMQ allows the same topic exchange/queue to be declared by
 * multiple services as long as the arguments match, which they do here. This service
 * never publishes, so unlike ride-service/payment-service there is no RabbitTemplate bean
 * here — only the MessageConverter, which Spring Boot's auto-configured listener container
 * factory picks up automatically for @RabbitListener deserialization.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "uber.exchange";
    public static final String RIDE_STATUS_QUEUE = "ride.status.queue";
    public static final String RIDE_STATUS_ROUTING_KEY = "ride.status.changed";
    public static final String PAYMENT_QUEUE = "payment.queue";
    public static final String PAYMENT_COMPLETED_ROUTING_KEY = "payment.completed";

    @Bean
    public TopicExchange uberExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue rideStatusQueue() {
        return new Queue(RIDE_STATUS_QUEUE);
    }

    @Bean
    public Binding rideStatusBinding(Queue rideStatusQueue, TopicExchange uberExchange) {
        return BindingBuilder.bind(rideStatusQueue).to(uberExchange).with(RIDE_STATUS_ROUTING_KEY);
    }

    @Bean
    public Queue paymentQueue() {
        return new Queue(PAYMENT_QUEUE);
    }

    @Bean
    public Binding paymentBinding(Queue paymentQueue, TopicExchange uberExchange) {
        return BindingBuilder.bind(paymentQueue).to(uberExchange).with(PAYMENT_COMPLETED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
