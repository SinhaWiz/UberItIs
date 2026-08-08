package org.uber.notificationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.AbstractConnectionFactory;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "uber.exchange";
    public static final String RIDE_STATUS_QUEUE = "ride.status.queue";
    public static final String RIDE_STATUS_ROUTING_KEY = "ride.status.changed";

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
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
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