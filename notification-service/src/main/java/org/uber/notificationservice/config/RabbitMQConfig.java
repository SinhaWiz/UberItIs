package org.uber.notificationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.AbstractConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration for the Notification Service (consumer side).
 * Declares the same exchange, queues, and bindings that ride-service and
 * payment-service publish to so this service can consume from them.
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

    // ── Ride status queue (same name as declared in ride-service) ──

    @Bean
    public Queue rideStatusQueue() {
        return new Queue(RIDE_STATUS_QUEUE);
    }

    @Bean
    public Binding rideStatusBinding(Queue rideStatusQueue, TopicExchange uberExchange) {
        return BindingBuilder.bind(rideStatusQueue).to(uberExchange).with(RIDE_STATUS_ROUTING_KEY);
    }

    // ── Payment queue (same name as declared in payment-service) ──

    @Bean
    public Queue paymentQueue() {
        return new Queue(PAYMENT_QUEUE);
    }

    @Bean
    public Binding paymentBinding(Queue paymentQueue, TopicExchange uberExchange) {
        return BindingBuilder.bind(paymentQueue).to(uberExchange).with(PAYMENT_COMPLETED_ROUTING_KEY);
    }

    // ── JSON message converter for deserialization ──

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);
        return factory;
    }

    @Bean
    public BeanPostProcessor rabbitConnectionNameCustomizer(@Value("${spring.application.name}") String serviceName) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof AbstractConnectionFactory factory) {
                    factory.setConnectionNameStrategy(cf -> serviceName);
                }
                return bean;
            }
        };
    }
}