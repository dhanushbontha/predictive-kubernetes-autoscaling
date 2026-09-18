package com.autoscaling.backend.controller;

import com.autoscaling.backend.dto.StartExperimentRequest;
import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.WorkloadScenario;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExperimentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/experiments/start validates missing required fields")
    void testStartExperimentValidationFailure() throws Exception {
        StartExperimentRequest invalidReq = new StartExperimentRequest();

        mockMvc.perform(post("/api/experiments/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    @DisplayName("POST /api/experiments/start creates and returns new experiment")
    void testStartExperimentSuccess() throws Exception {
        StartExperimentRequest validReq = new StartExperimentRequest();
        validReq.setName("Test_Stable_HPA");
        validReq.setScenario(WorkloadScenario.STABLE);
        validReq.setAutoscalingMode(AutoscalingMode.REACTIVE_HPA);
        validReq.setTargetRps(25);
        validReq.setDurationSeconds(60);
        validReq.setSloLatencyMs(200);

        mockMvc.perform(post("/api/experiments/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.scenario").value("STABLE"))
                .andExpect(jsonPath("$.autoscalingMode").value("REACTIVE_HPA"));
    }

    @Test
    @DisplayName("GET /api/experiments lists experiments")
    void testListExperiments() throws Exception {
        mockMvc.perform(get("/api/experiments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("GET /api/dashboard/live returns live telemetry structure")
    void testGetLiveDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard/live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentReplicas", notNullValue()));
    }
}
