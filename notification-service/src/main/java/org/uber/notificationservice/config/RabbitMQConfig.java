package org.uber.notificationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.AbstractConnectionFactory;
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