package com.autoscaling.workload.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WorkloadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/workload returns 200 OK and expected workload result prefix")
    void testWorkloadEndpoint() throws Exception {
        mockMvc.perform(get("/api/workload?iterations=1000"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Workload processed. Result: ")));
    }

    @Test
    @DisplayName("GET /actuator/health returns 200 OK with UP status")
    void testActuatorHealthEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("UP")));
    }

    @Test
    @DisplayName("GET /actuator/prometheus returns 200 OK and prometheus formatted metrics")
    void testActuatorPrometheusEndpoint() throws Exception {
        // Trigger one workload request to ensure http_server_requests metric is registered
        mockMvc.perform(get("/api/workload?iterations=100"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("http_server_requests_seconds")));
    }
}
