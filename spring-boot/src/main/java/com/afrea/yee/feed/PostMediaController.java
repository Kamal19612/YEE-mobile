package com.afrea.yee.feed;

import com.afrea.yee.common.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PostMediaController {

	private final PostMediaFileService postMediaFileService;

	public PostMediaController(PostMediaFileService postMediaFileService) {
		this.postMediaFileService = postMediaFileService;
	}

	@GetMapping("/feed/{postId}/media/{mediaId}")
	public ResponseEntity<byte[]> open(@PathVariable long postId, @PathVariable long mediaId) {
		return postMediaFileService.open(CurrentUser.id().orElse(null), postId, mediaId);
	}

	@GetMapping("/media/post-media/{postId}/{filename:.+}")
	public ResponseEntity<byte[]> openPublic(@PathVariable long postId, @PathVariable String filename) {
		return postMediaFileService.openPublic(postId, filename);
	}
}
