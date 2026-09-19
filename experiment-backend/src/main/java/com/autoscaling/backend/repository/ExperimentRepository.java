package com.autoscaling.backend.repository;

import com.autoscaling.backend.entity.ExperimentEntity;
import com.autoscaling.backend.model.AutoscalingMode;
import com.autoscaling.backend.model.ExperimentStatus;
import com.autoscaling.backend.model.WorkloadScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for Experiment records.
 */
@Repository
public interface ExperimentRepository extends JpaRepository<ExperimentEntity, String> {

    List<ExperimentEntity> findByScenario(WorkloadScenario scenario);

    List<ExperimentEntity> findByStatus(ExperimentStatus status);

    List<ExperimentEntity> findByScenarioAndAutoscalingMode(WorkloadScenario scenario, AutoscalingMode mode);

    List<ExperimentEntity> findAllByOrderByStartTimeDesc();
}
