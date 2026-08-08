package org.uber.notificationservice.config;

import org.springframework.amqp.rabbit.connection.AbstractConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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