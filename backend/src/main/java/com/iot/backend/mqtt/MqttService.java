package com.iot.backend.mqtt;

import com.iot.backend.entity.Datasensor;
import com.iot.backend.entity.Sensor;
import com.iot.backend.repository.DatasensorRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.ActionRepository;

import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MqttService {

    @Value("${mqtt.broker}")
    private String broker;

    @Value("${mqtt.client-id}")
    private String clientId;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    @Value("${mqtt.topic.sensor}")
    private String sensorTopic;

    @Value("${mqtt.topic.response}")
    private String responseTopic;

    private MqttClient mqttClient;

    private final DatasensorRepository datasensorRepository;
    private final SensorRepository sensorRepository;
    private final ActionRepository actionRepository;

    public MqttService(
            DatasensorRepository datasensorRepository,
            SensorRepository sensorRepository,
            ActionRepository actionRepository) {

        this.datasensorRepository = datasensorRepository;
        this.sensorRepository = sensorRepository;
        this.actionRepository = actionRepository;
    }

    @PostConstruct
    public void connect() {

        try {

            mqttClient = new MqttClient(broker, clientId);

            MqttConnectOptions options = new MqttConnectOptions();

            options.setCleanSession(true);
            options.setAutomaticReconnect(true);

            // MQTT username + password
            options.setUserName(username);
            options.setPassword(password.toCharArray());

            mqttClient.connect(options);

            System.out.println("=================================");
            System.out.println("MQTT CONNECTED");
            System.out.println("Broker: " + broker);
            System.out.println("Sensor topic: " + sensorTopic);
            System.out.println("Response topic: " + responseTopic);
            System.out.println("=================================");

            // =====================================================
            // SUBSCRIBE SENSOR DATA
            // =====================================================

            mqttClient.subscribe(sensorTopic, (topic, message) -> {

                String payload = new String(message.getPayload());

                System.out.println("MQTT SENSOR MESSAGE RECEIVED");
                System.out.println("Topic: " + topic);
                System.out.println("Message: " + payload);

                saveSensorData(payload);
            });

            System.out.println(
                    "MQTT SUBSCRIBED: " + sensorTopic
            );

            // =====================================================
            // SUBSCRIBE DEVICE RESPONSE
            // =====================================================

            mqttClient.subscribe(responseTopic, (topic, message) -> {

                String payload = new String(message.getPayload());

                System.out.println("=================================");
                System.out.println("MQTT DEVICE RESPONSE RECEIVED");
                System.out.println("Topic: " + topic);
                System.out.println("Message: " + payload);
                System.out.println("=================================");

                handleDeviceResponse(payload);
            });

            System.out.println(
                    "MQTT SUBSCRIBED: " + responseTopic
            );

        } catch (MqttException e) {

            System.err.println(
                    "MQTT CONNECTION ERROR: "
                            + e.getMessage()
            );
        }
    }

    // =====================================================
    // XỬ LÝ DEVICE RESPONSE
    // =====================================================

    private void handleDeviceResponse(String payload) {

        try {

            System.out.println(
                    "Device response received: " + payload
            );

            // Ví dụ response:
            // {"device":"LED1","action":"ON","status":"SUCCESS"}

            String device = null;
            String status = null;

            String data = payload
                    .replace("{", "")
                    .replace("}", "")
                    .replace("\"", "");

            String[] fields = data.split(",");

            for (String field : fields) {

                String[] keyValue = field.split(":");

                String key = keyValue[0].trim();
                String value = keyValue[1].trim();

                if (key.equals("device")) {
                    device = value;
                }

                if (key.equals("status")) {
                    status = value;
                }
            }

            System.out.println("Device: " + device);
            System.out.println("Status: " + status);

            if (device == null || status == null) {
                System.err.println("Response không hợp lệ");
                return;
            }

            // Xác định device ID
            Integer deviceId = null;

            switch (device) {

                case "LED1":
                    deviceId = 1;
                    break;

                case "LED2":
                    deviceId = 2;
                    break;

                case "LED3":
                    deviceId = 3;
                    break;

                default:
                    System.err.println(
                            "Không xác định được device: " + device
                    );
                    return;
            }

            String finalStatus = status;

            actionRepository
                    .findTopByDevice_IdDeviceAndStatusOrderByCreatedAtDesc(
                            deviceId,
                            "loading"
                    )
                    .ifPresent(action -> {

                        if ("SUCCESS".equalsIgnoreCase(finalStatus)) {

                            action.setStatus("success");

                            actionRepository.save(action);

                            System.out.println(
                                    "ACTION STATUS UPDATED: loading -> success"
                            );

                        } else {

                            action.setStatus("failed");

                            actionRepository.save(action);

                            System.out.println(
                                    "ACTION STATUS UPDATED: loading -> failed"
                            );
                        }
                    });

        } catch (Exception e) {

            System.err.println(
                    "ERROR HANDLING DEVICE RESPONSE: "
                            + e.getMessage()
            );
        }
    }

    // =====================================================
    // SAVE SENSOR DATA
    // =====================================================

    private void saveSensorData(String payload) {

        try {

            String data = payload
                    .replace("{", "")
                    .replace("}", "")
                    .replace("\"", "");

            String[] fields = data.split(",");

            Double temp = null;
            Double humid = null;
            Double light = null;

            for (String field : fields) {

                String[] keyValue = field.split(":");

                String key = keyValue[0].trim();

                Double value =
                        Double.parseDouble(
                                keyValue[1].trim()
                        );

                switch (key) {

                    case "temperature":
                        temp = value;
                        break;

                    case "humidity":
                        humid = value;
                        break;

                    case "light":
                        light = value;
                        break;
                }
            }

            LocalDateTime now =
                    LocalDateTime.now();

            saveOneSensor(
                    1,
                    temp,
                    now
            );

            saveOneSensor(
                    2,
                    humid,
                    now
            );

            saveOneSensor(
                    3,
                    light,
                    now
            );

            System.out.println(
                    "SENSOR DATA SAVED TO MYSQL"
            );

        } catch (Exception e) {

            System.err.println(
                    "ERROR SAVING SENSOR DATA: "
                            + e.getMessage()
            );
        }
    }

    // =====================================================
    // SAVE ONE SENSOR
    // =====================================================

    private void saveOneSensor(
            Integer sensorId,
            Double value,
            LocalDateTime recordedAt) {

        if (value == null) {
            return;
        }

        Sensor sensor =
                sensorRepository
                        .findById(sensorId)
                        .orElse(null);

        if (sensor == null) {

            System.err.println(
                    "Sensor not found: "
                            + sensorId
            );

            return;
        }

        Datasensor datasensor =
                new Datasensor();

        datasensor.setSensor(sensor);
        datasensor.setValue(value);
        datasensor.setRecordedAt(recordedAt);

        datasensorRepository.save(datasensor);
    }

    // =====================================================
    // PUBLISH DEVICE CONTROL
    // =====================================================

    public void publishDeviceControl(
            String mqttKey,
            String action) {

        try {

            String payload =
                    "{"
                            + "\""
                            + mqttKey
                            + "\":\""
                            + action
                            + "\""
                            + "}";

            mqttClient.publish(
                    "device_control",
                    new MqttMessage(
                            payload.getBytes()
                    )
            );

            System.out.println(
                    "================================="
            );

            System.out.println(
                    "MQTT DEVICE CONTROL SENT"
            );

            System.out.println(
                    "Topic: device_control"
            );

            System.out.println(
                    "Message: " + payload
            );

            System.out.println(
                    "================================="
            );

        } catch (MqttException e) {

            System.err.println(
                    "ERROR PUBLISH DEVICE CONTROL: "
                            + e.getMessage()
            );

            throw new RuntimeException(
                    "Không thể gửi lệnh MQTT"
            );
        }
    }
}