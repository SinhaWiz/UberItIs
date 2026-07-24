package org.uber.eurekaserver;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.netflix.eureka.server.event.EurekaInstanceCanceledEvent;
import org.springframework.cloud.netflix.eureka.server.event.EurekaInstanceRegisteredEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class EurekaStateChangeListener {

    private static final Logger log = LoggerFactory.getLogger(EurekaStateChangeListener.class);

    @EventListener
    public void onInstanceRegistered(EurekaInstanceRegisteredEvent event) {
        log.info("==========================================================");
        log.info("[INFO]: ({}) has been registered successfully", event.getInstanceInfo().getAppName());
        log.info("==========================================================");
    }

    @EventListener
    public void onInstanceCanceled(EurekaInstanceCanceledEvent event) {
        log.info("==========================================================");
        log.info("[INFO]: ({}) has been disconnected or deregistered", event.getAppName());
        log.info("==========================================================");
    }
}
