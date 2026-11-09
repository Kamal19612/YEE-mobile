package com.afrea.yee.sync.repository;

import com.afrea.yee.sync.entity.SyncState;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncStateRepository extends JpaRepository<SyncState, Short> {
}
