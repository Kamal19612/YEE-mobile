package com.afrea.yee.sync.repository;

import com.afrea.yee.sync.entity.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {
}
