<?php
/**
 * Plugin Name: URBANOISE Rebuild Trigger
 * Description: Triggers a site rebuild webhook when blog posts are published, updated, or deleted.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('URBANOISE_BUILD_HOOK_URL')) {
    define('URBANOISE_BUILD_HOOK_URL', getenv('URBANOISE_BUILD_HOOK_URL') ?: '');
}

if (!defined('URBANOISE_BUILD_HOOK_SECRET')) {
    define('URBANOISE_BUILD_HOOK_SECRET', getenv('URBANOISE_BUILD_HOOK_SECRET') ?: '');
}

if (!function_exists('urbanoise_trigger_rebuild')) {
    function urbanoise_trigger_rebuild($event, $post_id = 0, $post_type = 'post')
    {
        $hook_url = URBANOISE_BUILD_HOOK_URL;
        if (!$hook_url) {
            return;
        }

        $payload = array(
            'event' => $event,
            'postId' => (int) $post_id,
            'postType' => (string) $post_type,
            'site' => home_url('/'),
            'timestamp' => gmdate('c'),
        );

        $headers = array(
            'Content-Type' => 'application/json',
        );

        if (URBANOISE_BUILD_HOOK_SECRET) {
            $headers['X-Urbanoise-Webhook-Secret'] = URBANOISE_BUILD_HOOK_SECRET;
        }

        wp_remote_post($hook_url, array(
            'method' => 'POST',
            'timeout' => 12,
            'redirection' => 2,
            'blocking' => false,
            'headers' => $headers,
            'body' => wp_json_encode($payload),
        ));
    }
}

if (!function_exists('urbanoise_on_post_status_transition')) {
    function urbanoise_on_post_status_transition($new_status, $old_status, $post)
    {
        if (!$post || wp_is_post_revision($post->ID) || wp_is_post_autosave($post->ID)) {
            return;
        }

        if ($post->post_type !== 'post') {
            return;
        }

        $was_published = ($old_status === 'publish');
        $is_published = ($new_status === 'publish');

        if (!$was_published && !$is_published) {
            return;
        }

        if ($was_published && $is_published) {
            urbanoise_trigger_rebuild('post.updated', $post->ID, $post->post_type);
            return;
        }

        if (!$was_published && $is_published) {
            urbanoise_trigger_rebuild('post.published', $post->ID, $post->post_type);
            return;
        }

        urbanoise_trigger_rebuild('post.unpublished', $post->ID, $post->post_type);
    }
}

if (!function_exists('urbanoise_on_before_delete_post')) {
    function urbanoise_on_before_delete_post($post_id)
    {
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post') {
            return;
        }

        urbanoise_trigger_rebuild('post.deleted', $post_id, $post->post_type);
    }
}

add_action('transition_post_status', 'urbanoise_on_post_status_transition', 10, 3);
add_action('before_delete_post', 'urbanoise_on_before_delete_post', 10, 1);
