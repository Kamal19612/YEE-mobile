package com.afrea.yee.admin;

import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.sync.AfreaSyncService;
import com.afrea.yee.sync.SyncRunResult;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/sync")
public class AdminSyncController {

	private final AfreaSyncService afreaSyncService;

	public AdminSyncController(AfreaSyncService afreaSyncService) {
		this.afreaSyncService = afreaSyncService;
	}

	@PostMapping("/run")
	public ResponseEntity<ApiResponse<Map<String, Object>>> run(
			@RequestParam(defaultValue = "false") boolean full) {
		SyncRunResult result = afreaSyncService.run(full);
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("logId", result.logId());
		data.put("status", result.status());
		data.put("created", result.created());
		data.put("updated", result.updated());
		data.put("skipped", result.skipped());
		data.put("errors", result.errors());
		data.put("generatedAt", result.generatedAt() == null ? null : result.generatedAt().toString());
		data.put("endedAt", result.endedAt() == null ? null : result.endedAt().toString());
		return ResponseEntity.ok(ApiResponse.ok(data));
	}
}
