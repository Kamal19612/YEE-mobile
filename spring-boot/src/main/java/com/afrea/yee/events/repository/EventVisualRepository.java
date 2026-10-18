package com.afrea.yee.events.repository;

import com.afrea.yee.events.entity.EventVisual;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventVisualRepository extends JpaRepository<EventVisual, UUID> {

	List<EventVisual> findByEventIdOrderBySortOrderAscCreatedAtAsc(UUID eventId);

	Optional<EventVisual> findByIdAndEventId(UUID id, UUID eventId);

	int countByEventId(UUID eventId);

	void deleteByEventId(UUID eventId);
}
