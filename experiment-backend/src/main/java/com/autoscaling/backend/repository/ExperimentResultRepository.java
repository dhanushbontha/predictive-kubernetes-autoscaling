package com.autoscaling.backend.repository;

import com.autoscaling.backend.entity.ExperimentResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA Repository for ExperimentResult records.
 */
@Repository
public interface ExperimentResultRepository extends JpaRepository<ExperimentResultEntity, Long> {
}
