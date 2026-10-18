package com.afrea.yee.events.repository;

import com.afrea.yee.events.entity.EventReport;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventReportRepository extends JpaRepository<EventReport, UUID> {

	Optional<EventReport> findByEventId(UUID eventId);

	void deleteByEventId(UUID eventId);
}
