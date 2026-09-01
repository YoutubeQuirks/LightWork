/*
Copyright © 2026 YoutubeQuirks (https://github.com/YoutubeQuirks).
Permission is granted to modify and use this file for personal or public use, provided that the modifications do not aim to
hide the script’s original identity or trademarks.
This copyright notice must remain at the top of the file and not be modified.
*/

// ==UserScript==
// @name         LightWork
// @namespace    YoutubeQuirks
// @version      0.66
// @description  Returns the old Embedded player UI. The script is in beta, bugs and edge cases may occur.
// @author       YoutubeQuirks
// @homepage     https://github.com/YoutubeQuirks/LightWork
// @updateURL    https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWork.user.js
// @downloadURL  https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWork.user.js
// @supportURL   https://github.com/YoutubeQuirks/LightWork/issues
// @icon         https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/DisplayIcon.png
// @match        https://*.youtube.com/embed/*
// @match        https://example.net/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==


// Private NameSpace
(function () {
    'use strict';

    //-- START OF USER CONFIG --//

    // WARNING: THIS CONFIG IS IGNORED WHEN LIGHTWORK IS LOADED BY USING THE LIGHTWORKLOADER SCRIPT

    // LightWork now loads the latest embed player build with the old UI instead of loading older builds. The old build init technique is only kept as backup.
    // indicates if the backup player should be loaded
    let LightWork_useBackup = false;
    // indicates if the page should be reloaded when LightWork is injected too late and retry (recommended due to weird browser behavior)
    let LightWork_retryInjection = true;

    //-- END OF USER CONFIG --//

    // If LightWork was loaded by using the LightWorkLoader, override the config based on the loader’s attributes
    let CurrentScript = document.currentScript;
    if (CurrentScript?.hasAttribute("LightWorkLoader")) {
        LightWork_useBackup = CurrentScript.hasAttribute("LightWork_useBackup");
        LightWork_retryInjection = CurrentScript.hasAttribute("LightWork_retryInjection");
    }

    // indicates if we should change the player version in the config data to the latest one (if we aren’t using the backup player)
    if (!LightWork_useBackup) {
        if (typeof unsafeWindow !== "undefined") {
            unsafeWindow.LightWork_changePlayerVersion = true;
        }
        else {
            window.LightWork_changePlayerVersion = true;
        }
    }

    // Disables TrustedTypes (required for dynamic script injection)
    if (window.trustedTypes && window.trustedTypes.createPolicy && !window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: string => string,
            createScriptURL: string => string,
            createScript: string => string
        });
    }

    // Handle errors
    function LightWork_error(error) {
        // If no explanation was provided, use a default one
        if (!error) {
            error = "Something went wrong. Please try again later.";
        }

        // Log it to console
        console.error('[LightWork] ', error);
    }

    // Inject old Youtube styles
    function LightWork_injectStyles() {
        // Dynamic Youtube styles (present in the last old UI player version)
        let s1 = document.createElement('style');
        s1.id = 'wm-inject-css';
        s1.textContent = `
            tp-yt-iron-overlay-backdrop {
                display: none !important;
            }

            ytd-consent-bump-v2-lightbox {
                display: none !important;
            }
        `;
        document.head.appendChild(s1);

        // Fonts
        let s2 = document.createElement('style');
        s2.setAttribute('name', 'www-roboto');
        s2.textContent = `
            @font-face {
                font-family: 'Roboto';
                font-style: normal;
                font-weight: 400;
                font-stretch: normal;
                src: url(https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmUiA8.ttf) format('truetype');
            }

            @font-face {
                font-family: 'Roboto';
                font-style: normal;
                font-weight: 500;
                font-stretch: normal;
                src: url(https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWub2bVmUiA8.ttf) format('truetype');
            }
        `;
        document.head.appendChild(s2);

        // Page & player styles
        let s3 = document.createElement('style');
        s3.textContent = `
            html {
                overflow: hidden;
            }

            body {
                font: 12px Roboto, Arial, sans-serif;
                background-color: #000;
                color: #fff;
                height: 100%;
                width: 100%;
                overflow: hidden;
                position: absolute;
                margin: 0;
                padding: 0;
            }

            #player {
                width: 100%;
                height: 100%;
            }

            h1 {
                text-align: center;
                color: #fff;
            }   

            h3 {
                margin-top: 6px;
                margin-bottom: 3px;
            }

            .player-unavailable {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                padding: 25px;
                font-size: 13px;
                background: url(https://www.youtube.com/img/meh7.png) 50% 65% no-repeat;
            }

            .player-unavailable .message {
                text-align: left;
                margin: 0 -5px 15px;
                padding: 0 5px 14px;
                border-bottom: 1px solid #888;
                font-size: 19px;
                font-weight: normal;
            }

            .player-unavailable a {
                color: #167ac6;
                text-decoration: none;
            }
        `;
        document.head.appendChild(s3);

        // Load the CSS file used for the entire Youtube player
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://www.youtube.com/s/player/4c5cf06a/www-player.css';
        link.setAttribute('name', 'www-player');
        document.head.appendChild(link);

        // Preload the backup embed.js file that will be later fetched by base.js
        if (LightWork_useBackup) {
            let link2 = document.createElement('link');
            link2.rel = 'preload';
            link2.href = 'https://www.youtube.com/s/player/4c5cf06a/player_ias.vflset/en_US/embed.js';
            link2.setAttribute('name', 'player/embed');
            link2.as = 'script';
            document.head.appendChild(link2);
        }
    }

    // Inject old Youtube scripts
    // IMPORTANT: The player can function normally without some of the following scripts, however, they are preserved for compatibility and documentation
    // those scripts will have a comment saying so. I don’t personally recommend to remove them, as it can lead to unexpected edge cases
    function LightWork_injectScripts() {
        // Override the config that is later sent to Youtube
        // Extract important values, such as login info, recommendations info, video data, etc.
        let ConfigOverride = document.createElement('script');
        // make sure our script isn’t removed by the init observer
        ConfigOverride.setAttribute('LightWork', '');
        ConfigOverride.textContent = String.raw`
function OverrideConfig() {
    let OriginalValue = structuredClone(this.data_);
    window.NewBaseURL = OriginalValue?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.jsUrl;
    this.data_ = {
        "CLIENT_CANARY_STATE": "none",
        "DEVICE": "ceng\u003dUSER_DEFINED\u0026cplatform\u003dDESKTOP",
        "EVENT_ID": this.data_?.EVENT_ID,
        "EXPERIMENT_FLAGS": {
            "ab_det_apm": true,
            "ab_det_el_h": true,
            "ab_det_em_inj": true,
            "ab_l_sig_st": true,
            "ab_l_sig_st_e": true,
            "action_companion_center_align_description": true,
            "allow_skip_networkless": true,
            "always_send_and_write": true,
            "att_web_record_metrics": true,
            "attmusi": true,
            "c3_enable_button_impression_logging": true,
            "c3_watch_page_component": true,
            "cancel_pending_navs": true,
            "client_ui_enable_multi_track_audio_on_web_embedded_player": true,
            "config_age_report_killswitch": true,
            "cow_optimize_idom_compat": true,
            "csi_on_gel": true,
            "delhi_mweb_colorful_sd": true,
            "delhi_mweb_colorful_sd_v2": true,
            "deprecate_pair_servlet_enabled": true,
            "desktop_sparkles_light_cta_button": true,
            "disable_child_node_auto_formatted_strings": true,
            "disable_log_to_visitor_layer": true,
            "disable_pacf_logging_for_memory_limited_tv": true,
            "embeds_desktop_enable_volume_slider": true,
            "embeds_enable_eid_enforcement_for_youtube": true,
            "embeds_enable_get_player_error_mapping": true,
            "embeds_enable_info_panel_dismissal": true,
            "embeds_enable_pfp_always_unbranded": true,
            "embeds_muted_autoplay_sound_fix": true,
            "embeds_web_updated_shorts_definition_fix": true,
            "enable_access_code_service_rpc": true,
            "enable_active_view_display_ad_renderer_web_home": true,
            "enable_android_web_view_top_insets_bugfix": true,
            "enable_client_sli_logging": true,
            "enable_client_streamz_web": true,
            "enable_client_ve_spec": true,
            "enable_cloud_save_error_popup_after_retry": true,
            "enable_dai_sdf_h5_preroll": true,
            "enable_datasync_id_header_in_web_vss_pings": true,
            "enable_default_mono_cta_migration_web_client": true,
            "enable_docked_chat_messages": true,
            "enable_drop_shadow_experiment": true,
            "enable_embeds_new_caption_language_picker": true,
            "enable_entity_store_from_dependency_injection": true,
            "enable_inline_muted_playback_on_web_search": true,
            "enable_inline_muted_playback_on_web_search_for_vdc": true,
            "enable_inline_muted_playback_on_web_search_for_vdcb": true,
            "enable_is_extended_monitoring": true,
            "enable_is_mini_app_page_active_bugfix": true,
            "enable_logging_first_user_action_after_game_ready": true,
            "enable_ltc_param_fetch_from_innertube": true,
            "enable_menu_renderer_button_in_mweb_hclr": true,
            "enable_mini_app_command_handler_mweb_fix": true,
            "enable_mini_guide_downloads_item": true,
            "enable_mixed_direction_formatted_strings": true,
            "enable_mweb_keyboard_shortcuts": true,
            "enable_names_handles_account_switcher": true,
            "enable_network_request_logging_on_game_events": true,
            "enable_new_paid_product_placement": true,
            "enable_open_in_new_tab_icon_for_short_dr_for_desktop_search": true,
            "enable_origin_query_parameter_bugfix": true,
            "enable_pause_ads_on_ytv_html5": true,
            "enable_payments_purchase_manager": true,
            "enable_pdp_icon_prefetch": true,
            "enable_pl_r_si_fa": true,
            "enable_place_pivot_url": true,
            "enable_pv_screen_modern_text": true,
            "enable_removing_navbar_title_on_hashtag_page_mweb": true,
            "enable_rta_manager": true,
            "enable_sdf_companion_h5": true,
            "enable_sdf_dai_h5_midroll": true,
            "enable_sdf_h5_endemic_mid_post_roll": true,
            "enable_sdf_on_h5_unplugged_vod_midroll": true,
            "enable_sdf_shorts_player_bytes_h5": true,
            "enable_sending_unwrapped_game_audio_as_serialized_metadata": true,
            "enable_sfv_effect_pivot_url": true,
            "enable_shorts_new_carousel": true,
            "enable_skip_ad_guidance_prompt": true,
            "enable_skippable_ads_for_unplugged_ad_pod": true,
            "enable_smearing_expansion_dai": true,
            "enable_time_out_messages": true,
            "enable_timeline_view_modern_transcript_fe": true,
            "enable_video_display_compact_button_group_for_desktop_search": true,
            "enable_web_delhi_icons": true,
            "enable_web_home_top_landscape_image_layout_level_click": true,
            "enable_web_tiered_gel": true,
            "enable_window_constrained_buy_flow_dialog": true,
            "enable_wiz_queue_effect_and_on_init_initial_runs": true,
            "enable_ypc_spinners": true,
            "enable_yt_ata_iframe_authuser": true,
            "export_networkless_options": true,
            "export_player_version_to_ytconfig": true,
            "fill_single_video_with_notify_to_lasr": true,
            "fix_ads_tracking_for_swf_config_deprecation_mweb": true,
            "h5_companion_enable_adcpn_macro_substitution_for_click_pings": true,
            "h5_inplayer_enable_adcpn_macro_substitution_for_click_pings": true,
            "h5_reset_cache_and_filter_before_update_masthead": true,
            "hide_channel_creation_title_for_mweb": true,
            "high_ccv_client_side_caching_h5": true,
            "html5_log_trigger_events_with_debug_data": true,
            "html5_ssdai_enable_media_end_cue_range": true,
            "idb_immediate_commit": true,
            "il_attach_cache_limit": true,
            "il_use_view_model_logging_context": true,
            "json_condensed_response": true,
            "kev_adb_pg": true,
            "kevlar_gel_error_routing": true,
            "kevlar_watch_cinematics": true,
            "live_chat_enable_controller_extraction": true,
            "live_chat_enable_rta_manager": true,
            "log_click_with_layer_from_element_in_command_handler": true,
            "mdx_enable_privacy_disclosure_ui": true,
            "mdx_load_cast_api_bootstrap_script": true,
            "medium_progress_bar_modification": true,
            "migrate_remaining_web_ad_badges_to_innertube": true,
            "mobile_account_menu_refresh": true,
            "mweb_account_linking_noapp": true,
            "mweb_allow_modern_search_suggest_behavior": true,
            "mweb_animated_actions": true,
            "mweb_app_upsell_button_direct_to_app": true,
            "mweb_c3_enable_adaptive_signals": true,
            "mweb_c3_library_page_enable_recent_shelf": true,
            "mweb_c3_remove_web_navigation_endpoint_data": true,
            "mweb_c3_use_canonical_from_player_response": true,
            "mweb_cinematic_watch": true,
            "mweb_command_handler": true,
            "mweb_delay_watch_initial_data": true,
            "mweb_disable_searchbar_scroll": true,
            "mweb_enable_browse_chunks": true,
            "mweb_enable_colorful_ai_summary": true,
            "mweb_enable_fine_scrubbing_for_recs": true,
            "mweb_enable_imp_portal": true,
            "mweb_enable_keto_batch_player_fullscreen": true,
            "mweb_enable_keto_batch_player_progress_bar": true,
            "mweb_enable_keto_batch_player_tooltips": true,
            "mweb_enable_lockup_view_model_for_ucp": true,
            "mweb_enable_mix_panel_title_metadata": true,
            "mweb_enable_more_drawer": true,
            "mweb_enable_optional_fullscreen_landscape_locking": true,
            "mweb_enable_overlay_touch_manager": true,
            "mweb_enable_premium_carve_out_fix": true,
            "mweb_enable_refresh_detection": true,
            "mweb_enable_search_imp": true,
            "mweb_enable_shorts_rhs_no_background_protection": true,
            "mweb_enable_shorts_video_preload": true,
            "mweb_enable_skippables_on_jio_phone": true,
            "mweb_enable_two_line_title_on_shorts": true,
            "mweb_enable_varispeed_controller": true,
            "mweb_enable_watch_feed_infinite_scroll": true,
            "mweb_enable_wrapped_unplugged_pause_membership_dialog_renderer": true,
            "mweb_fix_monitor_visibility_after_render": true,
            "mweb_force_ios_fallback_to_native_control": true,
            "mweb_fp_auto_fullscreen": true,
            "mweb_fullscreen_controls": true,
            "mweb_fullscreen_controls_action_buttons": true,
            "mweb_fullscreen_watch_system": true,
            "mweb_get_endpoint_from_atag_command": true,
            "mweb_home_reactive_shorts": true,
            "mweb_innertube_search_command": true,
            "mweb_kaios_enable_autoplay_switch_view_model": true,
            "mweb_lang_in_html": true,
            "mweb_like_button_synced_with_entities": true,
            "mweb_logo_use_home_page_ve": true,
            "mweb_native_control_in_faux_fullscreen_shared": true,
            "mweb_player_control_on_hover": true,
            "mweb_player_delhi_dtts": true,
            "mweb_player_settings_use_bottom_sheet": true,
            "mweb_player_show_previous_next_buttons_in_playlist": true,
            "mweb_player_skip_no_op_state_changes": true,
            "mweb_player_user_select_none": true,
            "mweb_playlist_engagement_panel": true,
            "mweb_progress_bar_seek_on_mouse_click": true,
            "mweb_pull_2_full": true,
            "mweb_pull_2_full_enable_touch_handlers": true,
            "mweb_schedule_warm_watch_response": true,
            "mweb_searchbox_legacy_navigation": true,
            "mweb_see_fewer_shorts": true,
            "mweb_shorts_comments_panel_id_change": true,
            "mweb_shorts_early_continuation": true,
            "mweb_show_ios_smart_banner": true,
            "mweb_show_sign_in_button_from_header": true,
            "mweb_use_server_url_on_startup": true,
            "mweb_watch_captions_enable_auto_translate": true,
            "mweb_watch_captions_set_default_size": true,
            "mweb_watch_stop_scheduler_on_player_response": true,
            "mweb_watchfeed_big_thumbnails": true,
            "mweb_yt_searchbox": true,
            "networkless_logging": true,
            "no_client_ve_attach_unless_shown": true,
            "pageid_as_header_web": true,
            "playback_settings_use_switch_menu": true,
            "player_controls_autonav_fix": true,
            "player_controls_skip_double_signal_update": true,
            "player_controls_volume_controls_use_player_props": true,
            "polymer_bad_build_labels": true,
            "polymer_verifiy_app_state": true,
            "qoe_send_and_write": true,
            "remove_chevron_from_ad_disclosure_banner_h5": true,
            "remove_masthead_channel_banner_on_refresh": true,
            "remove_slot_id_exited_trigger_for_dai_in_player_slot_expire": true,
            "service_worker_enabled": true,
            "service_worker_push_enabled": true,
            "service_worker_push_home_page_prompt": true,
            "service_worker_push_watch_page_prompt": true,
            "shell_load_gcf": true,
            "shorten_initial_gel_batch_timeout": true,
            "shorts_declutter_ui": true,
            "should_use_yt_voice_endpoint_in_kaios": true,
            "smarter_ve_dedupping": true,
            "speedmaster_no_seek": true,
            "stop_handling_click_for_non_rendering_overlay_layout": true,
            "suppress_error_204_logging": true,
            "synced_panel_scrolling_controller": true,
            "use_event_time_ms_header": true,
            "use_fifo_for_networkless": true,
            "use_request_time_ms_header": true,
            "use_session_based_sampling": true,
            "use_thumbnail_overlay_time_status_renderer_for_live_badge": true,
            "vss_final_ping_send_and_write": true,
            "vss_playback_use_send_and_write": true,
            "web_adaptive_repeat_ase": true,
            "web_always_load_chat_support": true,
            "web_api_url": true,
            "web_attributed_string_deep_equal_bugfix": true,
            "web_autonav_allow_off_by_default": true,
            "web_button_or_anchor_list_item": true,
            "web_button_vm_refactor_disabled": true,
            "web_c3_log_app_init_finish": true,
            "web_component_wrapper_track_owner": true,
            "web_csi_action_sampling_enabled": true,
            "web_dedupe_ve_grafting": true,
            "web_disable_backdrop_filter": true,
            "web_enable_ab_rsp_cl": true,
            "web_enable_course_icon_update": true,
            "web_enable_error_204": true,
            "web_gcf_hashes_innertube": true,
            "web_gel_timeout_cap": true,
            "web_parent_target_for_sheets": true,
            "web_persist_server_autonav_state_on_client": true,
            "web_playback_associated_log_ctt": true,
            "web_playback_associated_ve": true,
            "web_prefetch_preload_video": true,
            "web_progress_bar_draggable": true,
            "web_shorts_wn_shelf_header_tuning": true,
            "web_update_panel_visibility_logging_fix": true,
            "web_watch_controls_state_signals": true,
            "web_wiz_attributed_string": true,
            "webfe_mweb_watch_microdata": true,
            "webfe_watch_shorts_canonical_url_fix": true,
            "webpo_exit_on_net_err": true,
            "wiz_diff_overwritable": true,
            "wiz_stamper_new_context_api": true,
            "woffle_used_state_report": true,
            "wpo_gel_strz": true,
            "wug_networking_gzip_request": true,
            "H5_async_logging_delay_ms": 30000.0,
            "attention_logging_scroll_throttle": 500.0,
            "autoplay_pause_by_lact_sampling_fraction": 0.0,
            "cinematic_watch_effect_opacity": 0.4,
            "log_window_onerror_fraction": 0.1,
            "speedmaster_playback_rate": 2.0,
            "tv_pacf_logging_sample_rate": 0.01,
            "web_attention_logging_scroll_throttle": 500.0,
            "web_load_prediction_threshold": 0.1,
            "web_navigation_prediction_threshold": 0.1,
            "web_pbj_log_warning_rate": 0.0,
            "web_system_health_fraction": 0.01,
            "ytidb_transaction_ended_event_rate_limit": 0.02,
            "active_time_update_interval_ms": 10000,
            "att_init_delay": 500,
            "autoplay_pause_by_lact_sec": 0,
            "botguard_async_snapshot_timeout_ms": 3000,
            "check_navigator_accuracy_timeout_ms": 0,
            "cinematic_watch_css_filter_blur_strength": 40,
            "cinematic_watch_fade_out_duration": 500,
            "close_webview_delay_ms": 100,
            "cloud_save_game_data_rate_limit_ms": 3000,
            "compression_disable_point": 10,
            "custom_active_view_tos_timeout_ms": 3600000,
            "embeds_widget_poll_interval_ms": 0,
            "gel_min_batch_size": 3,
            "gel_queue_timeout_max_ms": 60000,
            "get_async_timeout_ms": 60000,
            "hide_cta_for_home_web_video_ads_animate_in_time": 2,
            "html5_byterate_soft_cap": 0,
            "initial_gel_batch_timeout": 2000,
            "max_body_size_to_compress": 500000,
            "max_prefetch_window_sec_for_livestream_optimization": 10,
            "min_prefetch_offset_sec_for_livestream_optimization": 20,
            "mini_app_container_iframe_src_update_delay_ms": 0,
            "multiple_preview_news_duration_time": 11000,
            "mweb_c3_toast_duration_ms": 5000,
            "mweb_deep_link_fallback_timeout_ms": 10000,
            "mweb_delay_response_received_actions": 100,
            "mweb_fp_dpad_rate_limit_ms": 0,
            "mweb_fp_dpad_watch_title_clamp_lines": 0,
            "mweb_history_manager_cache_size": 100,
            "mweb_ios_fullscreen_playback_transition_delay_ms": 500,
            "mweb_ios_fullscreen_system_pause_epilson_ms": 0,
            "mweb_override_response_store_expiration_ms": 0,
            "mweb_shorts_early_continuation_trigger_threshold": 4,
            "mweb_shorts_number_of_thumbnails_shown": 2,
            "mweb_w2w_max_age_seconds": 0,
            "mweb_watch_captions_default_size": 2,
            "neon_dark_launch_gradient_count": 0,
            "network_polling_interval": 30000,
            "play_click_interval_ms": 30000,
            "play_ping_interval_ms": 10000,
            "prefetch_comments_ms_after_video": 0,
            "send_config_hash_timer": 0,
            "service_worker_push_logged_out_prompt_watches": -1,
            "service_worker_push_prompt_cap": -1,
            "service_worker_push_prompt_delay_microseconds": 3888000000000,
            "slow_compressions_before_abandon_count": 4,
            "speedmaster_cancellation_movement_dp": 10,
            "speedmaster_touch_activation_ms": 500,
            "web_attention_logging_throttle": 500,
            "web_foreground_heartbeat_interval_ms": 28000,
            "web_gel_debounce_ms": 10000,
            "web_logging_max_batch": 100,
            "web_max_tracing_events": 50,
            "web_session_replay_send_after_timeout": 0,
            "web_tracing_session_replay": 0,
            "wil_icon_max_concurrent_fetches": 9999,
            "ytcsi_debug_max_size": 100,
            "ytidb_remake_db_retries": 1,
            "ytidb_reopen_db_retries": 0,
            "WebClientReleaseProcessCritical__youtube_embeds_client_version_override": "",
            "WebClientReleaseProcessCritical__youtube_embeds_web_client_version_override": "",
            "WebClientReleaseProcessCritical__youtube_mweb_client_version_override": "",
            "debug_forced_internalcountrycode": "",
            "enable_web_media_service": "DISABLED",
            "il_payload_scraping": "",
            "live_chat_unicode_emoji_json_url": "https://www.gstatic.com/youtube/img/emojis/emojis-svg-9.json",
            "mweb_deep_link_feature_tag_suffix": "11268432",
            "mweb_enable_shorts_innertube_player_prefetch_trigger": "NONE",
            "mweb_fp_dpad": "home,search,browse,channel,create_channel,experiments,settings,trending,oops,404,paid_memberships,sponsorship,premium,shorts",
            "mweb_fp_dpad_linear_navigation": "",
            "mweb_fp_dpad_linear_navigation_visitor": "",
            "mweb_fp_dpad_visitor": "",
            "mweb_preload_video_by_player_vars": "",
            "place_pivot_triggering_container_alternate": "",
            "place_pivot_triggering_counterfactual_container_alternate": "",
            "service_worker_push_force_notification_prompt_tag": "1",
            "service_worker_scope": "/",
            "suggest_exp_str": "",
            "web_client_version_override": "",
            "kevlar_command_handler_command_banlist": [],
            "mini_app_ids_without_game_ready": ["UgkxHHtsak1SC8mRGHMZewc4HzeAY3yhPPmJ", "Ugkx7OgzFqE6z_5Mtf4YsotGfQNII1DF_RBm"],
            "web_op_signal_type_banlist": [],
            "web_tracing_enabled_spans": ["event", "command"]
        },
        "GAPI_HINT_PARAMS": "m;/_/scs/abc-static/_/js/k\u003dgapi.gapi.en.AKdz2vhcyW0.O/d\u003d1/rs\u003dAHpOoo_GPfyZPmTuYcbMXzJr0yr8Akk4Tw/m\u003d__features__",
        "GAPI_HOST": "https://apis.google.com",
        "GAPI_LOCALE": this.data_?.GAPI_LOCALE,
        "GL": this?.data_?.GL,
        "HL": this?.data_?.HL,
        "HTML_DIR": "ltr",
        "HTML_LANG": this.data_?.HTML_LANG,
        "INNERTUBE_API_KEY": this.data_?.INNERTUBE_API_KEY,
        "INNERTUBE_API_VERSION": "v1",
        "INNERTUBE_CLIENT_NAME": "WEB_EMBEDDED_PLAYER",
        "INNERTUBE_CLIENT_VERSION": "1.20260220.06.00",
        "INNERTUBE_CONTEXT": {
            "client": {
                "hl": this.data_?.INNERTUBE_CONTEXT?.client?.hl,
                "gl": this.data_?.INNERTUBE_CONTEXT?.client?.gl,
                "remoteHost": this.data_?.INNERTUBE_CONTEXT?.client?.remoteHost,
                "deviceMake": "",
                "deviceModel": "",
                "visitorData": this.data_?.INNERTUBE_CONTEXT?.client?.visitorData,
                "userAgent": this.data_?.INNERTUBE_CONTEXT?.client?.userAgent,
                "clientName": "WEB_EMBEDDED_PLAYER",
                "clientVersion": "1.20260220.06.00",
                "osVersion": "",
                "originalUrl": this.data_?.INNERTUBE_CONTEXT?.client?.originalUrl,
                "platform": "DESKTOP",
                "clientFormFactor": "UNKNOWN_FORM_FACTOR",
                "configInfo": {
                    "appInstallData": this.data_?.INNERTUBE_CONTEXT?.client?.configInfo?.appInstallData
                },
                "deviceExperimentId": this.data_?.INNERTUBE_CONTEXT?.client?.deviceExperimentId,
                "rolloutToken": this.data_?.INNERTUBE_CONTEXT?.client?.rolloutToken
            },
            "user": {
                "lockedSafetyMode": false
            },
            "request": {
                "useSsl": true
            },
            "clickTracking": {
                "clickTrackingParams": this.data_?.INNERTUBE_CONTEXT?.clickTracking?.clickTrackingParams,
            },
            "thirdParty": {
                "embeddedPlayerContext": {
                    "embeddedPlayerEncryptedContext": this.data_?.INNERTUBE_CONTEXT?.thirdParty?.embeddedPlayerContext?.embeddedPlayerEncryptedContext,
                    "ancestorOriginsSupported": false
                }
            }
        },
        "INNERTUBE_CONTEXT_CLIENT_NAME": 56,
        "INNERTUBE_CONTEXT_CLIENT_VERSION": "1.20260220.06.00",
        "INNERTUBE_CONTEXT_GL": this.data_?.INNERTUBE_CONTEXT_GL,
        "INNERTUBE_CONTEXT_HL": this.data_?.INNERTUBE_CONTEXT_HL,
        "LATEST_ECATCHER_SERVICE_TRACKING_PARAMS": {
            "client.name": "WEB_EMBEDDED_PLAYER",
            "client.jsfeat": "es5"
        },
        "LOGGED_IN": this.data_?.LOGGED_IN,
        "PAGE_BUILD_LABEL": "youtube.embeds.web_20260220_06_RC00",
        "PAGE_CL": 873013257,
        "SERVER_NAME": "WebFE",
        "VISITOR_DATA": this.data_?.VISITOR_DATA,
        "WEB_PLAYER_CONTEXT_CONFIGS": {
            "WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER": {
                "rootElementId": "movie_player",
                "jsUrl": "https://www.youtube.com/s/player/4c5cf06a/player_ias.vflset/en_US/base.js",
                "cssUrl": "https://www.youtube.com/s/player/4c5cf06a/www-player.css",
                "contextId": "WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER",
                "eventLabel": "embedded",
                "contentRegion": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.contentRegion,
                "hl": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.hl,
                "hostLanguage": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.hostLanguage,
                "innertubeApiKey": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.innertubeApiKey,
                "innertubeApiVersion": "v1",
                "innertubeContextClientVersion": "1.20260220.06.00",
                "device": {
                    "brand": "",
                    "model": "",
                    "platform": "DESKTOP",
                    "interfaceName": "WEB_EMBEDDED_PLAYER",
                    "interfaceVersion": "1.20260220.06.00"
                },
                "serializedExperimentIds": "24004644,51010235,51063643,51098299,51204329,51222973,51340662,51349914,51353393,51366423,51372681,51389629,51404808,51459425,51489568,51490331,51500051,51505436,51526266,51530495,51534669,51564352,51565116,51578632,51583821,51585555,51586118,51605258,51605395,51609829,51611457,51615067,51620867,51622844,51638932,51647793,51648336,51653718,51672162,51681662,51683502,51691027,51693510,51693994,51696107,51698673,51700777,51701615,51704211,51707440,51707621,51717747,51719112,51719411,51719628,51723509,51729217,51732102,51735451,51737355,51742377,51742828,51744581,51749572,51751855,51752633,51760004,51761662,51762121,51763524,51763569,51763896,51771273,51772036,51773892,51775180,51778074,51781805,51783550,51784587,51790038,51790073,51793070",
                "serializedExperimentFlags": "H5_async_logging_delay_ms\u003d30000.0\u0026PlayerWeb__h5_enable_advisory_rating_restrictions\u003dtrue\u0026a11y_h5_associate_survey_question\u003dtrue\u0026ab_det_apm\u003dtrue\u0026ab_det_el_h\u003dtrue\u0026ab_det_em_inj\u003dtrue\u0026ab_l_sig_st\u003dtrue\u0026ab_l_sig_st_e\u003dtrue\u0026action_companion_center_align_description\u003dtrue\u0026ad_pod_disable_companion_persist_ads_quality\u003dtrue\u0026add_stmp_logs_for_voice_boost\u003dtrue\u0026allow_autohide_on_paused_videos\u003dtrue\u0026allow_drm_override\u003dtrue\u0026allow_live_autoplay\u003dtrue\u0026allow_poltergust_autoplay\u003dtrue\u0026allow_skip_networkless\u003dtrue\u0026allow_vp9_1080p_mq_enc\u003dtrue\u0026always_cache_redirect_endpoint\u003dtrue\u0026always_send_and_write\u003dtrue\u0026annotation_module_vast_cards_load_logging_fraction\u003d0.0\u0026assign_drm_family_by_format\u003dtrue\u0026att_web_record_metrics\u003dtrue\u0026attention_logging_scroll_throttle\u003d500.0\u0026attmusi\u003dtrue\u0026autoplay_time\u003d10000\u0026autoplay_time_for_fullscreen\u003d-1\u0026autoplay_time_for_music_content\u003d-1\u0026bg_vm_reinit_threshold\u003d7200000\u0026block_tvhtml5_simply_embedded\u003dtrue\u0026blocked_packages_for_sps\u003d[]\u0026botguard_async_snapshot_timeout_ms\u003d3000\u0026captions_url_add_ei\u003dtrue\u0026check_navigator_accuracy_timeout_ms\u003d0\u0026client_ui_enable_multi_track_audio_on_web_embedded_player\u003dtrue\u0026compression_disable_point\u003d10\u0026cow_optimize_idom_compat\u003dtrue\u0026csi_on_gel\u003dtrue\u0026custom_active_view_tos_timeout_ms\u003d3600000\u0026dash_manifest_version\u003d5\u0026debug_bandaid_hostname\u003d\u0026debug_bandaid_port\u003d0\u0026debug_sherlog_username\u003d\u0026delhi_fast_follow_autonav_toggle\u003dtrue\u0026delhi_modern_player_default_thumbnail_percentage\u003d0.0\u0026delhi_modern_player_faster_autohide_delay_ms\u003d2000\u0026delhi_modern_player_pause_thumbnail_percentage\u003d0.6\u0026delhi_modern_web_player_blending_mode\u003d\u0026delhi_modern_web_player_disable_frosted_glass\u003dtrue\u0026delhi_modern_web_player_horizontal_volume_controls\u003dtrue\u0026delhi_modern_web_player_lhs_volume_controls\u003dtrue\u0026delhi_modern_web_player_responsive_compact_controls_threshold\u003d0\u0026deprecate_22\u003dtrue\u0026deprecate_delay_ping\u003dtrue\u0026deprecate_pair_servlet_enabled\u003dtrue\u0026desktop_sparkles_light_cta_button\u003dtrue\u0026disable_av1_setting\u003dtrue\u0026disable_channel_id_check_for_suspended_channels\u003dtrue\u0026disable_child_node_auto_formatted_strings\u003dtrue\u0026disable_lifa_for_supex_users\u003dtrue\u0026disable_log_to_visitor_layer\u003dtrue\u0026disable_mdx_connection_in_mdx_module_for_music_web\u003dtrue\u0026disable_pacf_logging_for_memory_limited_tv\u003dtrue\u0026disable_reduced_fullscreen_autoplay_countdown_for_minors\u003dtrue\u0026disable_reel_item_watch_format_filtering\u003dtrue\u0026disable_threegpp_progressive_formats\u003dtrue\u0026disable_touch_events_on_skip_button\u003dtrue\u0026edge_encryption_fill_primary_key_version\u003dtrue\u0026embeds_desktop_enable_volume_slider\u003dtrue\u0026embeds_enable_get_player_error_mapping\u003dtrue\u0026embeds_enable_info_panel_dismissal\u003dtrue\u0026embeds_enable_move_set_center_crop_to_public\u003dtrue\u0026embeds_enable_per_video_embed_config\u003dtrue\u0026embeds_enable_pfp_always_unbranded\u003dtrue\u0026embeds_web_lite_mode\u003d1\u0026enable_access_code_service_rpc\u003dtrue\u0026enable_aci_on_lr_feeds\u003dtrue\u0026enable_active_view_display_ad_renderer_web_home\u003dtrue\u0026enable_active_view_lr_shorts_video\u003dtrue\u0026enable_active_view_web_shorts_video\u003dtrue\u0026enable_ad_cpn_macro_substitution_for_click_pings\u003dtrue\u0026enable_ad_disclosure_banner_a11y_fix\u003dtrue\u0026enable_antiscraping_web_player_expired\u003dtrue\u0026enable_app_promo_endcap_eml_on_tablet\u003dtrue\u0026enable_batched_cross_device_pings_in_gel_fanout\u003dtrue\u0026enable_capability_format_filter_in_watch_server\u003dtrue\u0026enable_cast_for_web_unplugged\u003dtrue\u0026enable_cast_on_music_web\u003dtrue\u0026enable_cipher_for_manifest_urls\u003dtrue\u0026enable_cleanup_masthead_autoplay_hack_fix\u003dtrue\u0026enable_client_page_id_header_for_first_party_pings\u003dtrue\u0026enable_client_sli_logging\u003dtrue\u0026enable_client_ve_spec\u003dtrue\u0026enable_cta_banner_on_unplugged_lr\u003dtrue\u0026enable_custom_playhead_parsing\u003dtrue\u0026enable_dai_sdf_h5_preroll\u003dtrue\u0026enable_datasync_id_header_in_web_vss_pings\u003dtrue\u0026enable_default_mono_cta_migration_web_client\u003dtrue\u0026enable_dsa_ad_badge_for_action_endcap_on_android\u003dtrue\u0026enable_dsa_ad_badge_for_action_endcap_on_ios\u003dtrue\u0026enable_entity_store_from_dependency_injection\u003dtrue\u0026enable_error_corrections_infocard_web_client\u003dtrue\u0026enable_error_corrections_infocards_icon_web\u003dtrue\u0026enable_get_reminder_button_on_web\u003dtrue\u0026enable_inline_muted_playback_on_web_search\u003dtrue\u0026enable_inline_muted_playback_on_web_search_for_vdc\u003dtrue\u0026enable_inline_muted_playback_on_web_search_for_vdcb\u003dtrue\u0026enable_is_extended_monitoring\u003dtrue\u0026enable_kabuki_comments_on_shorts\u003ddisabled\u0026enable_ltc_param_fetch_from_innertube\u003dtrue\u0026enable_mixed_direction_formatted_strings\u003dtrue\u0026enable_modern_skip_button_on_web\u003dtrue\u0026enable_mweb_keyboard_shortcuts\u003dtrue\u0026enable_new_paid_product_placement\u003dtrue\u0026enable_open_in_new_tab_icon_for_short_dr_for_desktop_search\u003dtrue\u0026enable_out_of_stock_text_all_surfaces\u003dtrue\u0026enable_paid_content_overlay_bugfix\u003dtrue\u0026enable_pause_ads_on_ytv_html5\u003dtrue\u0026enable_pl_r_si_fa\u003dtrue\u0026enable_po_decoration_of_forced_tracks\u003dtrue\u0026enable_policy_based_hqa_filter_in_watch_server\u003dtrue\u0026enable_progres_commands_lr_feeds\u003dtrue\u0026enable_progress_commands_lr_shorts\u003dtrue\u0026enable_publishing_region_param_in_sus\u003dtrue\u0026enable_pv_screen_modern_text\u003dtrue\u0026enable_rpr_token_on_ltl_lookup\u003dtrue\u0026enable_sdf_companion_h5\u003dtrue\u0026enable_sdf_dai_h5_midroll\u003dtrue\u0026enable_sdf_h5_endemic_mid_post_roll\u003dtrue\u0026enable_sdf_on_h5_unplugged_vod_midroll\u003dtrue\u0026enable_sdf_shorts_player_bytes_h5\u003dtrue\u0026enable_server_driven_abr\u003dtrue\u0026enable_server_driven_abr_for_backgroundable\u003dtrue\u0026enable_server_driven_abr_url_generation\u003dtrue\u0026enable_server_driven_readahead\u003dtrue\u0026enable_skip_ad_guidance_prompt\u003dtrue\u0026enable_skip_to_next_messaging\u003dtrue\u0026enable_skippable_ads_for_unplugged_ad_pod\u003dtrue\u0026enable_smart_skip_player_controls_shown_on_web\u003dtrue\u0026enable_smart_skip_player_controls_shown_on_web_increased_triggering_sensitivity\u003dtrue\u0026enable_smart_skip_speedmaster_on_web\u003dtrue\u0026enable_smearing_expansion_dai\u003dtrue\u0026enable_split_screen_ad_baseline_experience_endemic_live_h5\u003dtrue\u0026enable_to_call_playready_backend_directly\u003dtrue\u0026enable_unified_action_endcap_on_web\u003dtrue\u0026enable_video_display_compact_button_group_for_desktop_search\u003dtrue\u0026enable_voice_boost_feature\u003dtrue\u0026enable_vp9_appletv5_on_server\u003dtrue\u0026enable_watch_server_rejected_formats_logging\u003dtrue\u0026enable_web_delhi_icons\u003dtrue\u0026enable_web_home_top_landscape_image_layout_level_click\u003dtrue\u0026enable_web_media_session_metadata_fix\u003dtrue\u0026enable_web_premium_varispeed_upsell\u003dtrue\u0026enable_web_tiered_gel\u003dtrue\u0026enable_wiz_queue_effect_and_on_init_initial_runs\u003dtrue\u0026enable_yt_ata_iframe_authuser\u003dtrue\u0026enable_ytv_csdai_vp9\u003dtrue\u0026export_networkless_options\u003dtrue\u0026export_player_version_to_ytconfig\u003dtrue\u0026fill_live_request_config_in_ustreamer_config\u003dtrue\u0026fill_single_video_with_notify_to_lasr\u003dtrue\u0026filter_vb_without_non_vb_equivalents\u003dtrue\u0026filter_vp9_for_live_dai\u003dtrue\u0026fix_ad_miniplayer_controls_rendering\u003dtrue\u0026fix_ads_tracking_for_swf_config_deprecation_mweb\u003dtrue\u0026fix_h5_toggle_button_a11y\u003dtrue\u0026fix_survey_color_contrast_on_destop\u003dtrue\u0026fix_toggle_button_role_for_ad_components\u003dtrue\u0026fresca_polling_delay_override\u003d0\u0026gab_return_sabr_ssdai_config\u003dtrue\u0026gel_min_batch_size\u003d3\u0026gel_queue_timeout_max_ms\u003d60000\u0026gvi_channel_client_screen\u003dtrue\u0026h5_companion_enable_adcpn_macro_substitution_for_click_pings\u003dtrue\u0026h5_enable_ad_mbs\u003dtrue\u0026h5_inplayer_enable_adcpn_macro_substitution_for_click_pings\u003dtrue\u0026h5_reset_cache_and_filter_before_update_masthead\u003dtrue\u0026heatseeker_decoration_threshold\u003d0.0\u0026hfr_dropped_framerate_fallback_threshold\u003d0\u0026hide_cta_for_home_web_video_ads_animate_in_time\u003d2\u0026high_ccv_client_side_caching_h5\u003dtrue\u0026hls_use_new_codecs_string_api\u003dtrue\u0026html5_ad_timeout_ms\u003d0\u0026html5_adaptation_step_count\u003d0\u0026html5_ads_preroll_lock_timeout_delay_ms\u003d15000\u0026html5_allow_multiview_tile_preload\u003dtrue\u0026html5_allow_video_keyframe_without_audio\u003dtrue\u0026html5_apply_min_failures\u003dtrue\u0026html5_apply_start_time_within_ads_for_ssdai_transitions\u003dtrue\u0026html5_atr_disable_force_fallback\u003dtrue\u0026html5_att_playback_timeout_ms\u003d30000\u0026html5_attach_num_random_bytes_to_bandaid\u003d0\u0026html5_attach_po_token_to_bandaid\u003dtrue\u0026html5_autonav_cap_idle_secs\u003d0\u0026html5_autonav_quality_cap\u003d720\u0026html5_autoplay_default_quality_cap\u003d0\u0026html5_auxiliary_estimate_weight\u003d0.0\u0026html5_av1_ordinal_cap\u003d0\u0026html5_bandaid_attach_content_po_token\u003dtrue\u0026html5_block_pip_safari_delay\u003d0\u0026html5_bypass_contention_secs\u003d0.0\u0026html5_byterate_soft_cap\u003d0\u0026html5_check_for_idle_network_interval_ms\u003d-1\u0026html5_chipset_soft_cap\u003d8192\u0026html5_consume_all_buffered_bytes_one_poll\u003dtrue\u0026html5_continuous_goodput_probe_interval_ms\u003d0\u0026html5_d6de4_cloud_project_number\u003d868618676952\u0026html5_d6de4_defer_timeout_ms\u003d0\u0026html5_debug_data_log_probability\u003d0.0\u0026html5_decode_to_texture_cap\u003dtrue\u0026html5_default_ad_gain\u003d0.5\u0026html5_default_av1_threshold\u003d0\u0026html5_default_quality_cap\u003d0\u0026html5_defer_fetch_att_ms\u003d0\u0026html5_delayed_retry_count\u003d1\u0026html5_delayed_retry_delay_ms\u003d5000\u0026html5_deprecate_adaptive_formats_string\u003dtrue\u0026html5_deprecate_adservice\u003dtrue\u0026html5_deprecate_manifestful_fallback\u003dtrue\u0026html5_deprecate_video_tag_pool\u003dtrue\u0026html5_desktop_vr180_allow_panning\u003dtrue\u0026html5_df_downgrade_thresh\u003d0.6\u0026html5_disable_loop_range_for_shorts_ads\u003dtrue\u0026html5_disable_move_pssh_to_moov\u003dtrue\u0026html5_disable_non_contiguous\u003dtrue\u0026html5_disable_ustreamer_constraint_for_sabr\u003dtrue\u0026html5_disable_web_safari_dai\u003dtrue\u0026html5_displayed_frame_rate_downgrade_threshold\u003d45\u0026html5_drm_byterate_soft_cap\u003d0\u0026html5_drm_check_all_key_error_states\u003dtrue\u0026html5_drm_cpi_license_key\u003dtrue\u0026html5_drm_live_byterate_soft_cap\u003d0\u0026html5_early_media_for_sharper_shorts\u003dtrue\u0026html5_enable_ac3\u003dtrue\u0026html5_enable_audio_track_stickiness\u003dtrue\u0026html5_enable_audio_track_stickiness_phase_two\u003dtrue\u0026html5_enable_caption_changes_for_mosaic\u003dtrue\u0026html5_enable_composite_embargo\u003dtrue\u0026html5_enable_d6de4\u003dtrue\u0026html5_enable_d6de4_cold_start_and_error\u003dtrue\u0026html5_enable_d6de4_idle_priority_job\u003dtrue\u0026html5_enable_drc\u003dtrue\u0026html5_enable_drc_toggle_api\u003dtrue\u0026html5_enable_eac3\u003dtrue\u0026html5_enable_embedded_player_visibility_signals\u003dtrue\u0026html5_enable_oduc\u003dtrue\u0026html5_enable_sabr_from_watch_server\u003dtrue\u0026html5_enable_sabr_host_fallback\u003dtrue\u0026html5_enable_server_driven_request_cancellation\u003dtrue\u0026html5_enable_sps_retry_backoff_metadata_requests\u003dtrue\u0026html5_enable_ssdai_transition_with_only_enter_cuerange\u003dtrue\u0026html5_enable_triggering_cuepoint_for_slot\u003dtrue\u0026html5_enable_tvos_dash\u003dtrue\u0026html5_enable_tvos_encrypted_vp9\u003dtrue\u0026html5_enable_widevine_for_alc\u003dtrue\u0026html5_enable_widevine_for_fast_linear\u003dtrue\u0026html5_encourage_array_coalescing\u003dtrue\u0026html5_fill_default_mosaic_audio_track_id\u003dtrue\u0026html5_fix_multi_audio_offline_playback\u003dtrue\u0026html5_fixed_media_duration_for_request\u003d0\u0026html5_force_sabr_from_watch_server_for_dfss\u003dtrue\u0026html5_forward_click_tracking_params_on_reload\u003dtrue\u0026html5_gapless_ad_autoplay_on_video_to_ad_only\u003dtrue\u0026html5_gapless_ended_transition_buffer_ms\u003d200\u0026html5_gapless_handoff_close_end_long_rebuffer_cfl\u003dtrue\u0026html5_gapless_handoff_close_end_long_rebuffer_delay_ms\u003d0\u0026html5_gapless_loop_seek_offset_in_milli\u003d0\u0026html5_gapless_slow_seek_cfl\u003dtrue\u0026html5_gapless_slow_seek_delay_ms\u003d0\u0026html5_gapless_slow_start_delay_ms\u003d0\u0026html5_generate_content_po_token\u003dtrue\u0026html5_generate_session_po_token\u003dtrue\u0026html5_gl_fps_threshold\u003d0\u0026html5_hard_cap_max_vertical_resolution_for_shorts\u003d0\u0026html5_hdcp_probing_stream_url\u003d\u0026html5_head_miss_secs\u003d0.0\u0026html5_hfr_quality_cap\u003d0\u0026html5_high_res_logging_percent\u003d0.01\u0026html5_hopeless_secs\u003d0\u0026html5_huli_ssdai_use_playback_state\u003dtrue\u0026html5_idle_rate_limit_ms\u003d0\u0026html5_ignore_sabrseek_during_adskip\u003dtrue\u0026html5_innertube_heartbeats_for_fairplay\u003dtrue\u0026html5_innertube_heartbeats_for_playready\u003dtrue\u0026html5_innertube_heartbeats_for_widevine\u003dtrue\u0026html5_jumbo_mobile_subsegment_readahead_target\u003d3.0\u0026html5_jumbo_ull_nonstreaming_mffa_ms\u003d4000\u0026html5_jumbo_ull_subsegment_readahead_target\u003d1.3\u0026html5_kabuki_drm_live_51_default_off\u003dtrue\u0026html5_license_constraint_delay\u003d5000\u0026html5_live_abr_head_miss_fraction\u003d0.0\u0026html5_live_abr_repredict_fraction\u003d0.0\u0026html5_live_chunk_readahead_proxima_override\u003d0\u0026html5_live_low_latency_bandwidth_window\u003d0.0\u0026html5_live_normal_latency_bandwidth_window\u003d0.0\u0026html5_live_quality_cap\u003d0\u0026html5_live_ultra_low_latency_bandwidth_window\u003d0.0\u0026html5_liveness_drift_chunk_override\u003d0\u0026html5_liveness_drift_proxima_override\u003d0\u0026html5_log_audio_abr\u003dtrue\u0026html5_log_experiment_id_from_player_response_to_ctmp\u003d\u0026html5_log_first_ssdai_requests_killswitch\u003dtrue\u0026html5_log_rebuffer_events\u003d5\u0026html5_log_trigger_events_with_debug_data\u003dtrue\u0026html5_log_vss_extra_lr_cparams_freq\u003d\u0026html5_long_rebuffer_jiggle_cmt_delay_ms\u003d0\u0026html5_long_rebuffer_threshold_ms\u003d30000\u0026html5_manifestless_unplugged\u003dtrue\u0026html5_manifestless_vp9_otf\u003dtrue\u0026html5_max_buffer_health_for_downgrade_prop\u003d0.0\u0026html5_max_buffer_health_for_downgrade_secs\u003d0.0\u0026html5_max_byterate\u003d0\u0026html5_max_discontinuity_rewrite_count\u003d0\u0026html5_max_drift_per_track_secs\u003d0.0\u0026html5_max_headm_for_streaming_xhr\u003d0\u0026html5_max_live_dvr_window_plus_margin_secs\u003d46800.0\u0026html5_max_quality_sel_upgrade\u003d0\u0026html5_max_redirect_response_length\u003d8192\u0026html5_max_selectable_quality_ordinal\u003d0\u0026html5_max_vertical_resolution\u003d0\u0026html5_maximum_readahead_seconds\u003d0.0\u0026html5_media_fullscreen\u003dtrue\u0026html5_media_time_weight_prop\u003d0.0\u0026html5_min_failures_to_delay_retry\u003d3\u0026html5_min_media_duration_for_append_prop\u003d0.0\u0026html5_min_media_duration_for_cabr_slice\u003d0.01\u0026html5_min_playback_advance_for_steady_state_secs\u003d0\u0026html5_min_quality_ordinal\u003d0\u0026html5_min_readbehind_cap_secs\u003d60\u0026html5_min_readbehind_secs\u003d0\u0026html5_min_seconds_between_format_selections\u003d0.0\u0026html5_min_selectable_quality_ordinal\u003d0\u0026html5_min_startup_buffered_media_duration_for_live_secs\u003d0.0\u0026html5_min_startup_buffered_media_duration_secs\u003d1.2\u0026html5_min_startup_duration_live_secs\u003d0.25\u0026html5_min_underrun_buffered_pre_steady_state_ms\u003d0\u0026html5_min_upgrade_health_secs\u003d0.0\u0026html5_minimum_readahead_seconds\u003d0.0\u0026html5_mock_content_binding_for_session_token\u003d\u0026html5_move_disable_airplay\u003dtrue\u0026html5_no_placeholder_rollbacks\u003dtrue\u0026html5_non_onesie_attach_po_token\u003dtrue\u0026html5_offline_download_timeout_retry_limit\u003d4\u0026html5_offline_failure_retry_limit\u003d2\u0026html5_offline_playback_position_sync\u003dtrue\u0026html5_offline_prevent_redownload_downloaded_video\u003dtrue\u0026html5_onesie_check_timeout\u003dtrue\u0026html5_onesie_defer_content_loader_ms\u003d0\u0026html5_onesie_live_ttl_secs\u003d8\u0026html5_onesie_prewarm_interval_ms\u003d0\u0026html5_onesie_prewarm_max_lact_ms\u003d0\u0026html5_onesie_redirector_timeout_ms\u003d0\u0026html5_onesie_use_signed_onesie_ustreamer_config\u003dtrue\u0026html5_override_micro_discontinuities_threshold_ms\u003d-1\u0026html5_paced_poll_min_health_ms\u003d0\u0026html5_paced_poll_ms\u003d0\u0026html5_pause_on_nonforeground_platform_errors\u003dtrue\u0026html5_peak_shave\u003dtrue\u0026html5_perf_cap_override_sticky\u003dtrue\u0026html5_performance_cap_floor\u003d360\u0026html5_perserve_av1_perf_cap\u003dtrue\u0026html5_picture_in_picture_logging_onresize_ratio\u003d0.0\u0026html5_platform_max_buffer_health_oversend_duration_secs\u003d0.0\u0026html5_platform_minimum_readahead_seconds\u003d0.0\u0026html5_player_att_initial_delay_ms\u003d3000\u0026html5_player_att_retry_delay_ms\u003d1500\u0026html5_player_autonav_logging\u003dtrue\u0026html5_player_dynamic_bottom_gradient\u003dtrue\u0026html5_player_min_build_cl\u003d-1\u0026html5_player_preload_ad_fix\u003dtrue\u0026html5_post_interrupt_readahead\u003d20\u0026html5_prefer_language_over_codec\u003dtrue\u0026html5_prefer_server_bwe3\u003dtrue\u0026html5_preload_wait_time_secs\u003d0.0\u0026html5_prevent_mobile_background_play_on_event_shared\u003dtrue\u0026html5_probe_primary_delay_base_ms\u003d0\u0026html5_process_all_encrypted_events\u003dtrue\u0026html5_publish_all_cuepoints\u003dtrue\u0026html5_qoe_proto_mock_length\u003d0\u0026html5_query_sw_secure_crypto_for_android\u003dtrue\u0026html5_random_playback_cap\u003d0\u0026html5_record_is_offline_on_playback_attempt_start\u003dtrue\u0026html5_record_ump_timing\u003dtrue\u0026html5_reload_by_kabuki_app\u003dtrue\u0026html5_remove_command_triggered_companions\u003dtrue\u0026html5_remove_not_servable_check_killswitch\u003dtrue\u0026html5_report_fatal_drm_restricted_error_killswitch\u003dtrue\u0026html5_report_slow_ads_as_error\u003dtrue\u0026html5_repredict_interval_ms\u003d0\u0026html5_request_only_hdr_or_sdr_keys\u003dtrue\u0026html5_request_size_max_kb\u003d0\u0026html5_request_size_min_kb\u003d0\u0026html5_reseek_after_time_jump_cfl\u003dtrue\u0026html5_reseek_after_time_jump_delay_ms\u003d0\u0026html5_resource_bad_status_delay_scaling\u003d1.5\u0026html5_restrict_streaming_xhr_on_sqless_requests\u003dtrue\u0026html5_retry_downloads_for_expiration\u003dtrue\u0026html5_retry_on_drm_key_error\u003dtrue\u0026html5_retry_on_drm_unavailable\u003dtrue\u0026html5_retry_quota_exceeded_via_seek\u003dtrue\u0026html5_return_playback_if_already_preloaded\u003dtrue\u0026html5_sabr_enable_server_xtag_selection\u003dtrue\u0026html5_sabr_force_max_network_interruption_duration_ms\u003d0\u0026html5_sabr_ignore_skipad_before_completion\u003dtrue\u0026html5_sabr_live_timing\u003dtrue\u0026html5_sabr_log_server_xtag_selection_onesie_mismatch\u003dtrue\u0026html5_sabr_min_media_bytes_factor_to_append_for_stream\u003d0.0\u0026html5_sabr_non_streaming_xhr_soft_cap\u003d0\u0026html5_sabr_non_streaming_xhr_vod_request_cancellation_timeout_ms\u003d0\u0026html5_sabr_report_partial_segment_estimated_duration\u003dtrue\u0026html5_sabr_report_request_cancellation_info\u003dtrue\u0026html5_sabr_request_limit_per_period\u003d20\u0026html5_sabr_request_limit_per_period_for_low_latency\u003d50\u0026html5_sabr_request_limit_per_period_for_ultra_low_latency\u003d20\u0026html5_sabr_skip_client_audio_init_selection\u003dtrue\u0026html5_sabr_unused_bloat_size_bytes\u003d0\u0026html5_samsung_kant_limit_max_bitrate\u003d0\u0026html5_seek_jiggle_cmt_delay_ms\u003d8000\u0026html5_seek_new_elem_delay_ms\u003d12000\u0026html5_seek_new_elem_shorts_delay_ms\u003d2000\u0026html5_seek_new_media_element_shorts_reuse_cfl\u003dtrue\u0026html5_seek_new_media_element_shorts_reuse_delay_ms\u003d0\u0026html5_seek_new_media_source_shorts_reuse_cfl\u003dtrue\u0026html5_seek_new_media_source_shorts_reuse_delay_ms\u003d0\u0026html5_seek_set_cmt_delay_ms\u003d2000\u0026html5_seek_timeout_delay_ms\u003d20000\u0026html5_server_stitched_dai_decorated_url_retry_limit\u003d5\u0026html5_session_po_token_interval_time_ms\u003d900000\u0026html5_set_video_id_as_expected_content_binding\u003dtrue\u0026html5_shorts_gapless_ad_slow_start_cfl\u003dtrue\u0026html5_shorts_gapless_ad_slow_start_delay_ms\u003d0\u0026html5_shorts_gapless_next_buffer_in_seconds\u003d0\u0026html5_shorts_gapless_no_gllat\u003dtrue\u0026html5_shorts_gapless_slow_start_delay_ms\u003d0\u0026html5_show_drc_toggle\u003dtrue\u0026html5_simplified_backup_timeout_sabr_live\u003dtrue\u0026html5_skip_empty_po_token\u003dtrue\u0026html5_skip_slow_ad_delay_ms\u003d15000\u0026html5_slow_start_no_media_source_delay_ms\u003d0\u0026html5_slow_start_timeout_delay_ms\u003d20000\u0026html5_ssdai_enable_media_end_cue_range\u003dtrue\u0026html5_ssdai_enable_new_seek_logic\u003dtrue\u0026html5_ssdai_failure_retry_limit\u003d0\u0026html5_ssdai_log_missing_ad_config_reason\u003dtrue\u0026html5_stall_factor\u003d0.0\u0026html5_sticky_duration_mos\u003d0\u0026html5_store_xhr_headers_readable\u003dtrue\u0026html5_streaming_resilience\u003dtrue\u0026html5_streaming_xhr_time_based_consolidation_ms\u003d-1\u0026html5_subsegment_readahead_load_speed_check_interval\u003d0.5\u0026html5_subsegment_readahead_min_buffer_health_secs\u003d0.25\u0026html5_subsegment_readahead_min_buffer_health_secs_on_timeout\u003d0.1\u0026html5_subsegment_readahead_min_load_speed\u003d1.5\u0026html5_subsegment_readahead_seek_latency_fudge\u003d0.5\u0026html5_subsegment_readahead_target_buffer_health_secs\u003d0.5\u0026html5_subsegment_readahead_timeout_secs\u003d2.0\u0026html5_track_overshoot\u003dtrue\u0026html5_transfer_processing_logs_interval\u003d1000\u0026html5_ugc_live_audio_51\u003dtrue\u0026html5_ugc_vod_audio_51\u003dtrue\u0026html5_unreported_seek_reseek_delay_ms\u003d0\u0026html5_update_time_on_seeked\u003dtrue\u0026html5_use_init_selected_audio\u003dtrue\u0026html5_use_jsonformatter_to_parse_player_response\u003dtrue\u0026html5_use_post_for_media\u003dtrue\u0026html5_use_shared_owl_instance\u003dtrue\u0026html5_use_ump\u003dtrue\u0026html5_use_ump_timing\u003dtrue\u0026html5_use_video_transition_endpoint_heartbeat\u003dtrue\u0026html5_video_tbd_min_kb\u003d0\u0026html5_viewport_undersend_maximum\u003d0.0\u0026html5_volume_slider_tooltip\u003dtrue\u0026html5_wasm_initialization_delay_ms\u003d0.0\u0026html5_web_po_experiment_ids\u003d[]\u0026html5_web_po_request_key\u003d\u0026html5_web_po_token_disable_caching\u003dtrue\u0026html5_webpo_idle_priority_job\u003dtrue\u0026html5_webpo_kaios_defer_timeout_ms\u003d0\u0026html5_woffle_resume\u003dtrue\u0026html5_workaround_delay_trigger\u003dtrue\u0026idb_immediate_commit\u003dtrue\u0026ignore_overlapping_cue_points_on_endemic_live_html5\u003dtrue\u0026il_attach_cache_limit\u003dtrue\u0026il_payload_scraping\u003d\u0026il_use_view_model_logging_context\u003dtrue\u0026initial_gel_batch_timeout\u003d2000\u0026injected_license_handler_error_code\u003d0\u0026injected_license_handler_license_status\u003d0\u0026ios_and_android_fresca_polling_delay_override\u003d0\u0026itdrm_always_generate_media_keys\u003dtrue\u0026itdrm_always_use_widevine_sdk\u003dtrue\u0026itdrm_disable_external_key_rotation_system_ids\u003d[]\u0026itdrm_enable_revocation_reporting\u003dtrue\u0026itdrm_injected_license_service_error_code\u003d0\u0026itdrm_set_sabr_license_constraint\u003dtrue\u0026itdrm_use_fairplay_sdk\u003dtrue\u0026itdrm_use_widevine_sdk_for_premium_content\u003dtrue\u0026itdrm_use_widevine_sdk_only_for_sampled_dod\u003dtrue\u0026itdrm_widevine_hardened_vmp_mode\u003dlog\u0026json_condensed_response\u003dtrue\u0026kev_adb_pg\u003dtrue\u0026kevlar_command_handler_command_banlist\u003d[]\u0026kevlar_delhi_modern_web_endscreen_ideal_tile_width_percentage\u003d0.27\u0026kevlar_delhi_modern_web_endscreen_max_rows\u003d2\u0026kevlar_delhi_modern_web_endscreen_max_width\u003d500\u0026kevlar_delhi_modern_web_endscreen_min_width\u003d200\u0026kevlar_gel_error_routing\u003dtrue\u0026kevlar_miniplayer_expand_top\u003dtrue\u0026kevlar_miniplayer_play_pause_on_scrim\u003dtrue\u0026kevlar_playback_associated_queue\u003dtrue\u0026launch_license_service_all_ott_videos_automatic_fail_open\u003dtrue\u0026live_chat_enable_controller_extraction\u003dtrue\u0026live_chat_enable_rta_manager\u003dtrue\u0026live_chunk_readahead\u003d3\u0026log_click_with_layer_from_element_in_command_handler\u003dtrue\u0026log_window_onerror_fraction\u003d0.1\u0026manifestless_post_live\u003dtrue\u0026manifestless_post_live_ufph\u003dtrue\u0026max_body_size_to_compress\u003d500000\u0026max_cdfe_quality_ordinal\u003d0\u0026max_prefetch_window_sec_for_livestream_optimization\u003d10\u0026max_resolution_for_white_noise\u003d360\u0026mdx_enable_privacy_disclosure_ui\u003dtrue\u0026mdx_load_cast_api_bootstrap_script\u003dtrue\u0026migrate_remaining_web_ad_badges_to_innertube\u003dtrue\u0026min_prefetch_offset_sec_for_livestream_optimization\u003d20\u0026mta_drc_mutual_exclusion_removal\u003dtrue\u0026music_enable_shared_audio_tier_logic\u003dtrue\u0026mweb_account_linking_noapp\u003dtrue\u0026mweb_enable_browse_chunks\u003dtrue\u0026mweb_enable_fine_scrubbing_for_recs\u003dtrue\u0026mweb_enable_skippables_on_jio_phone\u003dtrue\u0026mweb_native_control_in_faux_fullscreen_shared\u003dtrue\u0026mweb_player_control_on_hover\u003dtrue\u0026mweb_progress_bar_seek_on_mouse_click\u003dtrue\u0026mweb_shorts_comments_panel_id_change\u003dtrue\u0026network_polling_interval\u003d30000\u0026networkless_logging\u003dtrue\u0026new_codecs_string_api_uses_legacy_style\u003dtrue\u0026no_client_ve_attach_unless_shown\u003dtrue\u0026no_drm_on_demand_with_cc_license\u003dtrue\u0026no_filler_video_for_ssa_playbacks\u003dtrue\u0026onesie_add_gfe_frontline_to_player_request\u003dtrue\u0026onesie_enable_override_headm\u003dtrue\u0026override_drm_required_playback_policy_channels\u003d[]\u0026pageid_as_header_web\u003dtrue\u0026player_ads_set_adformat_on_client\u003dtrue\u0026player_bootstrap_method\u003dtrue\u0026player_controls_volume_controls_use_player_props\u003dtrue\u0026player_destroy_old_version\u003dtrue\u0026player_enable_playback_playlist_change\u003dtrue\u0026player_new_info_card_format\u003dtrue\u0026player_underlay_min_player_width\u003d768.0\u0026player_underlay_video_width_fraction\u003d0.6\u0026player_web_canary_stage\u003d0\u0026playready_first_play_expiration\u003d-1\u0026podcasts_videostats_default_flush_interval_seconds\u003d0\u0026polymer_bad_build_labels\u003dtrue\u0026polymer_verifiy_app_state\u003dtrue\u0026populate_format_set_info_in_cdfe_formats\u003dtrue\u0026populate_head_minus_in_watch_server\u003dtrue\u0026preskip_button_style_ads_backend\u003d\u0026proxima_auto_threshold_max_network_interruption_duration_ms\u003d0\u0026proxima_auto_threshold_min_bandwidth_estimate_bytes_per_sec\u003d0\u0026qoe_nwl_downloads\u003dtrue\u0026qoe_send_and_write\u003dtrue\u0026quality_cap_for_inline_non_app_ads\u003d0\u0026quality_cap_for_inline_playback\u003d0\u0026quality_cap_for_inline_playback_ads\u003d0\u0026read_ahead_model_name\u003d\u0026refactor_mta_default_track_selection\u003dtrue\u0026reject_hidden_live_formats\u003dtrue\u0026reject_live_vp9_mq_clear_with_no_abr_ladder\u003dtrue\u0026remove_chevron_from_ad_disclosure_banner_h5\u003dtrue\u0026remove_masthead_channel_banner_on_refresh\u003dtrue\u0026remove_slot_id_exited_trigger_for_dai_in_player_slot_expire\u003dtrue\u0026replace_playability_retriever_in_watch\u003dtrue\u0026return_drm_product_unknown_for_clear_playbacks\u003dtrue\u0026sabr_enable_host_fallback\u003dtrue\u0026self_podding_header_string_template\u003dself_podding_interstitial_message\u0026self_podding_midroll_choice_string_template\u003dself_podding_midroll_choice\u0026send_config_hash_timer\u003d0\u0026serve_adaptive_fmts_for_live_streams\u003dtrue\u0026set_mock_id_as_expected_content_binding\u003d\u0026shell_load_gcf\u003dtrue\u0026shorten_initial_gel_batch_timeout\u003dtrue\u0026shorts_mode_to_player_api\u003dtrue\u0026simply_embedded_enable_botguard\u003dtrue\u0026slow_compressions_before_abandon_count\u003d4\u0026small_avatars_for_comments\u003dtrue\u0026smart_skip_web_player_bar_min_hover_length_milliseconds\u003d1000\u0026smarter_ve_dedupping\u003dtrue\u0026speedmaster_cancellation_movement_dp\u003d10\u0026speedmaster_playback_rate\u003d2.0\u0026speedmaster_touch_activation_ms\u003d500\u0026stop_handling_click_for_non_rendering_overlay_layout\u003dtrue\u0026streaming_data_emergency_itag_blacklist\u003d[]\u0026substitute_ad_cpn_macro_in_ssdai\u003dtrue\u0026suppress_error_204_logging\u003dtrue\u0026trim_adaptive_formats_signature_cipher_for_sabr_content\u003dtrue\u0026tv_pacf_logging_sample_rate\u003d0.01\u0026tvhtml5_unplugged_preload_cache_size\u003d5\u0026use_event_time_ms_header\u003dtrue\u0026use_fifo_for_networkless\u003dtrue\u0026use_generated_media_keys_in_fairplay_requests\u003dtrue\u0026use_inlined_player_rpc\u003dtrue\u0026use_new_codecs_string_api\u003dtrue\u0026use_request_time_ms_header\u003dtrue\u0026use_rta_for_player\u003dtrue\u0026use_session_based_sampling\u003dtrue\u0026use_simplified_remove_webm_rules\u003dtrue\u0026use_thumbnail_overlay_time_status_renderer_for_live_badge\u003dtrue\u0026use_video_playback_premium_signal\u003dtrue\u0026variable_buffer_timeout_ms\u003d0\u0026vp9_drm_live\u003dtrue\u0026vss_final_ping_send_and_write\u003dtrue\u0026vss_playback_use_send_and_write\u003dtrue\u0026web_api_url\u003dtrue\u0026web_attention_logging_scroll_throttle\u003d500.0\u0026web_attention_logging_throttle\u003d500\u0026web_button_vm_refactor_disabled\u003dtrue\u0026web_cinematic_watch_settings\u003dtrue\u0026web_client_version_override\u003d\u0026web_component_wrapper_track_owner\u003dtrue\u0026web_csi_action_sampling_enabled\u003dtrue\u0026web_dedupe_ve_grafting\u003dtrue\u0026web_enable_ab_rsp_cl\u003dtrue\u0026web_enable_caption_language_preference_stickiness\u003dtrue\u0026web_enable_course_icon_update\u003dtrue\u0026web_enable_error_204\u003dtrue\u0026web_enable_keyboard_shortcut_for_timely_actions\u003dtrue\u0026web_enable_shopping_timely_shelf_client\u003dtrue\u0026web_enable_timely_actions\u003dtrue\u0026web_fix_fine_scrubbing_false_play\u003dtrue\u0026web_foreground_heartbeat_interval_ms\u003d28000\u0026web_fullscreen_shorts\u003dtrue\u0026web_gcf_hashes_innertube\u003dtrue\u0026web_gel_debounce_ms\u003d10000\u0026web_gel_timeout_cap\u003dtrue\u0026web_heat_map_v2\u003dtrue\u0026web_hide_next_button\u003dtrue\u0026web_hide_watch_info_empty\u003dtrue\u0026web_load_prediction_threshold\u003d0.1\u0026web_logging_max_batch\u003d100\u0026web_max_tracing_events\u003d50\u0026web_navigation_prediction_threshold\u003d0.1\u0026web_op_signal_type_banlist\u003d[]\u0026web_playback_associated_log_ctt\u003dtrue\u0026web_playback_associated_ve\u003dtrue\u0026web_player_api_logging_fraction\u003d0.01\u0026web_player_big_mode_screen_width_cutoff\u003d4001\u0026web_player_default_peeking_px\u003d36\u0026web_player_enable_featured_product_banner_exclusives_on_desktop\u003dtrue\u0026web_player_enable_featured_product_banner_promotion_text_on_desktop\u003dtrue\u0026web_player_frosted_glass_blur_radius\u003d16\u0026web_player_innertube_playlist_update\u003dtrue\u0026web_player_ipp_canary_type_for_logging\u003d\u0026web_player_log_click_before_generating_ve_conversion_params\u003dtrue\u0026web_player_miniplayer_in_context_menu\u003dtrue\u0026web_player_mouse_idle_wait_time_ms\u003d3000\u0026web_player_music_visualizer_treatment\u003dfake\u0026web_player_offline_playlist_auto_refresh\u003dtrue\u0026web_player_playable_sequences_refactor\u003dtrue\u0026web_player_quick_hide_timeout_ms\u003d250\u0026web_player_seek_chapters_by_shortcut\u003dtrue\u0026web_player_seek_overlay_additional_arrow_threshold\u003d200\u0026web_player_seek_overlay_duration_bump_scale\u003d0.9\u0026web_player_seek_overlay_linger_duration\u003d1000\u0026web_player_sentinel_is_uniplayer\u003dtrue\u0026web_player_show_music_in_this_video_graphic\u003dvideo_thumbnail\u0026web_player_spacebar_control_bugfix\u003dtrue\u0026web_player_ss_dai_ad_fetching_timeout_ms\u003d15000\u0026web_player_ss_media_time_offset\u003dtrue\u0026web_player_touch_idle_wait_time_ms\u003d4000\u0026web_player_transfer_timeout_threshold_ms\u003d10800000\u0026web_player_use_cinematic_label_2\u003dtrue\u0026web_player_use_new_api_for_quality_pullback\u003dtrue\u0026web_player_use_screen_width_for_big_mode\u003dtrue\u0026web_prefetch_preload_video\u003dtrue\u0026web_progress_bar_draggable\u003dtrue\u0026web_remix_allow_up_to_3x_playback_rate\u003dtrue\u0026web_session_replay_send_after_timeout\u003d0\u0026web_settings_menu_surface_custom_playback\u003dtrue\u0026web_settings_use_input_slider\u003dtrue\u0026web_tracing_enabled_spans\u003d[event, command]\u0026web_tracing_session_replay\u003d0\u0026web_wiz_attributed_string\u003dtrue\u0026webpo_exit_on_net_err\u003dtrue\u0026wil_icon_max_concurrent_fetches\u003d9999\u0026wiz_diff_overwritable\u003dtrue\u0026wiz_stamper_new_context_api\u003dtrue\u0026woffle_enable_download_status\u003dtrue\u0026woffle_used_state_report\u003dtrue\u0026wpo_gel_strz\u003dtrue\u0026write_reload_player_response_token_to_ustreamer_config_for_vod\u003dtrue\u0026ws_av1_max_height_floor\u003d0\u0026ws_av1_max_width_floor\u003d0\u0026ws_use_centralized_hqa_filter\u003dtrue\u0026wug_networking_gzip_request\u003dtrue\u0026ytcsi_debug_max_size\u003d100\u0026ytidb_remake_db_retries\u003d1\u0026ytidb_reopen_db_retries\u003d0\u0026ytidb_transaction_ended_event_rate_limit\u003d0.02\u0026html5_enable_sabr_on_yt_embeds\u003dtrue",
                "startMuted": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.startMuted,
                "mobileIphoneSupportsInlinePlayback": true,
                "isMobileDevice": false,
                "cspNonce": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.cspNonce,
                "canaryState": "none",
                "enableCsiLogging": true,
                "disableAutonav": false,
                "isEmbed": true,
                "disableCastApi": false,
                "serializedEmbedConfig": "{}",
                "disableMdxCast": false,
                "datasyncId": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.datasyncId,
                "encryptedHostFlags": this.data_?.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.encryptedHostFlags,
                "canaryStage": "",
                "trustedJsUrl": {
                    "privateDoNotAccessOrElseTrustedResourceUrlWrappedValue": "https://www.youtube.com/s/player/4c5cf06a/player_ias.vflset/en_US/base.js"
                },
                "trustedCssUrl": {
                    "privateDoNotAccessOrElseTrustedResourceUrlWrappedValue": "https://www.youtube.com/s/player/4c5cf06a/www-player.css"
                },
                "houseBrandUserStatus": "not_present",
                "enableSabrOnEmbed": false,
                "serializedClientExperimentFlags": "45713225\u003d0\u002645713227\u003d0\u002645718175\u003d0.0\u002645718176\u003d0.0\u002645721421\u003d0\u002645725538\u003d0.0\u002645725539\u003d0.0\u002645725540\u003d0.0\u002645725541\u003d0.0\u002645725542\u003d0.0\u002645725543\u003d0.0\u002645728334\u003d0.0\u002645728572\u003dtrue\u002645729215\u003dtrue\u002645732704\u003dtrue\u002645732791\u003dtrue\u002645735428\u003d4000.0\u002645737488\u003d0.0\u002645737489\u003d0.0\u002645739023\u003d0.0\u002645741339\u003d0.0\u002645741773\u003d0.0\u002645743228\u003d0.0\u002645746966\u003d0.0\u002645746967\u003d0.0\u002645747053\u003d0.0\u002645750947\u003d10240\u002645756201\u003dtrue\u002645756872\u003d0.0\u002645757426\u003d0.0\u002645757427\u003d0.0\u002645757750\u003d0.0\u002645757957\u003d0.0\u002645758467\u003d0.0\u002645761760\u003d200"
            }
        },
        "XSRF_FIELD_NAME": "session_token",
        "XSRF_TOKEN": this.data_?.XSRF_TOKEN,
        "SERVER_VERSION": "prod",
        "DATASYNC_ID": this.data_?.DATASYNC_ID,
        "SERIALIZED_CLIENT_CONFIG_DATA": this.data_?.SERIALIZED_CLIENT_CONFIG_DATA,
        "ROOT_VE_TYPE": 16623,
        "CLIENT_PROTOCOL": "HTTP/1.1",
        "CLIENT_TRANSPORT": "tcp",
        "PLAYER_CLIENT_VERSION": "1.20260217.11.00",
        "TIME_CREATED_MS": 1771892075844,
        "VALID_SESSION_TEMPDATA_DOMAINS": ["youtu.be", "youtube.com", "www.youtube.com", "web-green-qa.youtube.com", "web-release-qa.youtube.com", "web-integration-qa.youtube.com", "m.youtube.com", "mweb-green-qa.youtube.com", "mweb-release-qa.youtube.com", "mweb-integration-qa.youtube.com", "studio.youtube.com", "studio-green-qa.youtube.com", "studio-integration-qa.youtube.com"],
        "LOTTIE_URL": {
            "privateDoNotAccessOrElseTrustedResourceUrlWrappedValue": "https://www.youtube.com/s/desktop/2a7df5b3/jsbin/lottie-light.vflset/lottie-light.js"
        },
        "IDENTITY_MEMENTO": {
            "visitor_data": this.data_?.IDENTITY_MEMENTO?.visitor_data
        },
        "PLAYER_VARS": {
            "embedded_player_response": this.data_?.PLAYER_VARS?.embedded_player_response
        },
        "POST_MESSAGE_ORIGIN": "*",
        "DOMAIN_ADMIN_STATE": ""
    };

    if (window.LightWork_changePlayerVersion) { 
        let PlayerVersion = window.NewBaseURL.split('/').slice(3)[0]
        this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.jsUrl = this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.jsUrl.replace(/\/s\/player\/[^/]+/, '/s/player/' + PlayerVersion)
        this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.cssUrl = this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.cssUrl.replace(/\/s\/player\/[^/]+/, '/s/player/' + PlayerVersion)
        this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedJsUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue = this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedJsUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.replace(/\/s\/player\/[^/]+/, '/s/player/' + PlayerVersion)
        this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedCssUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue = this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedCssUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.replace(/\/s\/player\/[^/]+/, '/s/player/' + PlayerVersion)

        window.LightWork_fixUrlsForBackup = function () {
            ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.jsUrl = ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.jsUrl.replace('/s/player/' + PlayerVersion, '/s/player/4c5cf06a')
            ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.cssUrl = ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.cssUrl.replace('/s/player/' + PlayerVersion, '/s/player/4c5cf06a')
            ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedJsUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue = ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedJsUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.replace('/s/player/' + PlayerVersion, '/s/player/4c5cf06a')
            ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedCssUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue = ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.trustedCssUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.replace('/s/player/' + PlayerVersion, '/s/player/4c5cf06a')
        }
    }

    if (OriginalValue.PLAYER_VARS.video_id) {
        this.data_.PLAYER_VARS.video_id = OriginalValue.PLAYER_VARS.video_id;
    }

    if (OriginalValue.PLAYER_VARS.list) {
        this.data_.PLAYER_VARS.list = OriginalValue.PLAYER_VARS.list;
        let OriginalUrl = OriginalValue.INNERTUBE_CONTEXT.client.originalUrl;
        let listType = (OriginalUrl.match(/[?&]listType=([^&#]*)/) || [])[1] || null;
        if (listType) {
            this.data_.PLAYER_VARS.listType = listType;
        }
    }

    let resp = JSON.parse(this.data_?.PLAYER_VARS?.embedded_player_response);
    let tpr = resp?.embedPreview?.thumbnailPreviewRenderer;
    if (tpr) {
        if (!tpr.shareButton) {
            let existingShare = tpr.actionBarButtons.find(b => b.buttonRenderer.icon.iconType === "SHARE_ARROW");
            tpr.shareButton = existingShare;
        }

        if (!tpr.addToWatchLaterButton) {
            let existingWL = tpr.actionBarButtons.find(b => b.buttonRenderer.icon.iconType === "ADD_TO_WATCH_LATER");
            tpr.addToWatchLaterButton = existingWL;
        }
        this.data_.PLAYER_VARS.embedded_player_response = JSON.stringify(resp);
    }
    if (this.data_.LOGGED_IN) {
        this.data_.ID_TOKEN = OriginalValue.ID_TOKEN;
        this.data_.SESSION_INDEX = OriginalValue.SESSION_INDEX;
        this.data_.USER_SESSION_ID = OriginalValue.USER_SESSION_ID;
        this.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.authorizedUserIndex = OriginalValue.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER.authorizedUserIndex;
        this.data_.LOGIN_INFO = OriginalValue.LOGIN_INFO;
        this.data_.PLAYER_VARS.user_display_name = OriginalValue.PLAYER_VARS.user_display_name;
        this.data_.PLAYER_VARS.user_display_image = OriginalValue.PLAYER_VARS.user_display_image;
        this.data_.PLAYER_VARS.user_display_email = OriginalValue.PLAYER_VARS.user_display_email;
        this.data_.PLAYER_VARS.user_display_channel_handle = OriginalValue.PLAYER_VARS.user_display_channel_handle;
        this.data_.PLAYER_VARS.resolve_url_response = OriginalValue.PLAYER_VARS.resolve_url_response;
    }
    if (OriginalValue.VIDEO_ID) {
        this.data_.VIDEO_ID = OriginalValue.VIDEO_ID
    }
    if (OriginalValue.PLAYER_VARS.autoplay === true) {
        this.data_.PLAYER_VARS.autoplay = true;
    }
}

if (window.ytcfg && window.ytcfg.data_) {
    OverrideConfig.call(window.ytcfg);
}

else {
    let ytcfgValue;

    Object.defineProperty(window, 'ytcfg', {
        configurable: true,

        set(value) {
            ytcfgValue = value;

            let originalSet = value.set;

            value.set = function (...args) {
                let result = originalSet.apply(this, args);

                OverrideConfig.call(this, ...args);

                return result;
            };
        },

        get() {
            return ytcfgValue;
        }
    });
}
        `;
        document.head.appendChild(ConfigOverride);

        // Load fonts
        let s1 = document.createElement('script');
        s1.setAttribute('name', 'www-roboto');
        s1.setAttribute('LightWork', '');
        s1.textContent = `
        if (document.fonts && document.fonts.load) {
            document.fonts.load("400 10pt Roboto", "E");
            document.fonts.load("500 10pt Roboto", "E");
        }
        `
        document.head.appendChild(s1);

        // Youtube tracking & analytics (can be removed)
        let s2 = document.createElement('script');
        s2.setAttribute('LightWork', '');
        s2.textContent = `
            var ytcsi = {
      gt: function (n) {
        n = (n || "") + "data_";
        return ytcsi[n] || (ytcsi[n] = {
          tick: {},
          info: {},
          gel: {
            preLoggedGelInfos: []
          }
        })
      },
      now: window.performance && window.performance.timing && window.performance.now && window.performance.timing.navigationStart ? function () {
        return window.performance.timing.navigationStart + window.performance.now()
      } : function () {
        return (new Date).getTime()
      },
      tick: function (l, t, n) {
        var ticks = ytcsi.gt(n).tick;
        var v = t || ytcsi.now();
        if (ticks[l]) {
          ticks["_" + l] = ticks["_" + l] || [ticks[l]];
          ticks["_" + l].push(v)
        }
        ticks[l] = v
      },
      info: function (k, v, n) {
        ytcsi.gt(n).info[k] = v
      },
      infoGel: function (p, n) {
        ytcsi.gt(n).gel.preLoggedGelInfos.push(p)
      },
      setStart: function (t, n) {
        ytcsi.tick("_start", t, n)
      }
    };
    (function (w, d) {
      function isGecko() {
        if (!w.navigator) return false;
        try {
          if (w.navigator.userAgentData && w.navigator.userAgentData.brands && w.navigator.userAgentData.brands.length) {
            var brands = w.navigator.userAgentData.brands;
            var i = 0;
            for (; i < brands.length; i++)
              if (brands[i] && brands[i].brand === "Firefox") return true;
            return false
          }
        } catch (e) {
          setTimeout(function () {
            throw e;
          })
        }
        if (!w.navigator.userAgent) return false;
        var ua = w.navigator.userAgent;
        return ua.indexOf("Gecko") > 0 && ua.toLowerCase().indexOf("webkit") < 0 && ua.indexOf("Edge") < 0 && ua.indexOf("Trident") < 0 && ua.indexOf("MSIE") < 0
      }
      ytcsi.setStart(w.performance ? w.performance.timing.responseStart : null);
      var isPrerender = (d.visibilityState || d.webkitVisibilityState) == "prerender";
      var vName = !d.visibilityState && d.webkitVisibilityState ? "webkitvisibilitychange" : "visibilitychange";
      if (isPrerender) {
        var startTick = function () {
          ytcsi.setStart();
          d.removeEventListener(vName, startTick)
        };
        d.addEventListener(vName, startTick, false)
      }
      if (d.addEventListener) d.addEventListener(vName, function () {
        ytcsi.tick("vc")
      }, false);
      if (isGecko()) {
        var isHidden = (d.visibilityState || d.webkitVisibilityState) == "hidden";
        if (isHidden) ytcsi.tick("vc")
      }
      var slt = function (el, t) {
        setTimeout(function () {
          var n = ytcsi.now();
          el.loadTime = n;
          if (el.slt) el.slt()
        }, t)
      };
      w.__ytRIL = function (el) {
        if (!el.getAttribute("data-thumb"))
          if (w.requestAnimationFrame) w.requestAnimationFrame(function () {
            slt(el, 0)
          });
          else slt(el, 16)
      }
    })(window, document);
        `;
        document.head.appendChild(s2);

        // Calls an internal function when the page loads
        let s3 = document.createElement('script');
        s3.setAttribute('LightWork', '');
        s3.textContent = `
    window.ytAtP = new Promise(res => window.ytAtN = res);
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.ytAtN === "function") {
            window.ytAtN();
      }
      delete window.ytAtN;
    });
        `;
        document.head.appendChild(s3);

        // Youtube error tracking (can be removed)
        let s4 = document.createElement('script');
        s4.setAttribute('LightWork', '');
        s4.textContent = `
    window.yterr = window.yterr || true;
    window.unhandledErrorMessages = {};
    window.onerror = function (msg, url, line, opt_columnNumber, opt_error) {
      var err;
      if (opt_error) err = opt_error;
      else {
        err = new Error;
        err.message = msg;
        err.fileName = url;
        err.lineNumber = line;
        if (!isNaN(opt_columnNumber)) err["columnNumber"] = opt_columnNumber
      }
      var message = String(err.message);
      if (!err.message || message in window.unhandledErrorMessages) return;
      window.unhandledErrorMessages[message] = true;
      var img = new Image;
      window.emergencyTimeoutImg = img;
      img.onload = img.onerror = function () {
        delete window.emergencyTimeoutImg
      };
      var values = {
        "client.name": ytcfg.get("INNERTUBE_CONTEXT_CLIENT_NAME"),
        "client.version": ytcfg.get("INNERTUBE_CONTEXT_CLIENT_VERSION"),
        "msg": message,
        "type": "UnhandledWindow" + err.name,
        "file": err.fileName,
        "line": err.lineNumber,
        "stack": (err.stack || "").substr(0, 500)
      };
      var parts = [ytcfg.get("EMERGENCY_BASE_URL", "/error_204?t=jserror&level=ERROR")];
      var key;
      for (key in values) {
        var value = values[key];
        if (value) parts.push(key + "=" + encodeURIComponent(value))
      }
      img.src = parts.join("&")
    };
        `
        document.head.appendChild(s4);

        // Internal flags and configuration
        let s5 = document.createElement('script');
        s5.setAttribute('LightWork', '');
        s5.textContent = `
    window.WIZ_global_data = {
      "AfY8Hf": true,
      "FL1an": false,
      "HiPsbb": 0,
      "MUE6Ne": "youtube_web",
      "MuJWjd": false,
      "UUFaWc": "%.@.null,1000,2]",
      "cfb2h": "youtube.web-front-end-critical_20260222.10_p0",
      "fPDxwd": [],
      "hsFLT": "%.@.null,1000,2]",
      "iCzhFc": false,
      "nQyAE": {},
      "oxN3nb": {
        "1": false,
        "0": false,
        "610401301": false,
        "899588437": false,
        "772657768": true,
        "513659523": false,
        "568333945": true,
        "1331761403": false,
        "651175828": false,
        "722764542": false,
        "748402145": false,
        "748402146": false,
        "748402147": true,
        "824648567": true,
        "824656860": true,
        "333098724": false,
        "861377723": false,
        "861377724": false,
        "869336903": false
      },
      "u4g7r": "%.@.null,1,2]",
      "vJQk6": false,
      "xnI9P": true,
      "xwAfE": true,
      "yFnxrf": 2486
    };
        `
        document.head.appendChild(s5);

        // Appends a base.js script
        // This does not run, because it is injected with innerHTML. Its purely for compatibility reasons.
        let BaseContainer = document.createElement('div');
        BaseContainer.innerHTML = '<script src="https://www.youtube.com/s/player/4c5cf06a/player_ias.vflset/en_US/base.js" name="player/base" LightWork></script>';
        document.body.appendChild(BaseContainer.firstElementChild);

        // Get the new base URL (we set this earlier in the ConfigOverride script)
        let NewBaseURL = null;
        function GetNewBaseURL() {
            if (!NewBaseURL) {
                // if we are running inside a UserScript environment
                if (typeof unsafeWindow !== "undefined") {
                    // use the unsafe window to access properties from the site itself
                    NewBaseURL = unsafeWindow.NewBaseURL;
                }
                // otherwise, we are running inside a normal browser environment
                else {
                    NewBaseURL = window.NewBaseURL;
                }
            }
        }

        // Extract the LightWorkLanguage param from the URL to force a specific language (optional)
        let LightWorkLanguage = location.search.match(/[?&]LightWorkLanguage=([^&]*)/)?.[1];

        let OldBaseUrl = null;
        let BaseFetch = null;
        // Fetch the old and new base
        function FetchBases(UseBackup) {
            BaseFetch = Promise.all([
                new Promise(resolve => {
                    // retries every 1MS if the new base was not found (usually takes max 3 retries)
                    let wait = setInterval(() => {
                        GetNewBaseURL();
                        if (NewBaseURL) {
                            clearInterval(wait);
                            // Extract the language from the URL
                            LightWorkLanguage = NewBaseURL.split('/').slice(-2)[0];
                            // Extract the player version from the URL
                            let PlayerVersion = null;
                            if (!UseBackup) {
                                PlayerVersion = NewBaseURL.split('/').slice(3)[0];
                            }
                            else {
                                PlayerVersion = "4c5cf06a";
                            }
                            // fetch the old base
                            OldBaseUrl = `https://www.youtube.com/s/player/${PlayerVersion}/player_ias.vflset/${LightWorkLanguage}/base.js`;
                            resolve(fetch(OldBaseUrl)
                                // Handle a successful/failed response
                                .then(response => response.ok ? response.text() : Promise.reject(response.status)));
                        }
                    }, 1);
                }),
                // Get the new base URL
                UseBackup && new Promise(resolve => {
                    let wait = setInterval(() => {
                        GetNewBaseURL();
                        if (NewBaseURL) {
                            clearInterval(wait);
                            // fetch the new base
                            resolve(fetch(NewBaseURL)
                                // Handle a successful/failed response
                                .then(response => response.ok ? response.text() : Promise.reject(response.status)));
                        }
                    }, 1);
                })
            ]);
            // after base and new base was fetched
            BaseFetch.then(([base, newBase]) => {
                // Init an old version of the player build (we have a backup option, so the script is more reliable in the long term)
                if (UseBackup) {
                    // Replaces/adds a lot of lines in the old base to load the video

                    // Defines all the promises that are later going to be used to wait for the video URL and SABR token
                    base = `let CurrentVideoId=null;window.GoogleVideoMediaUrlPromise=new Promise(resolve=>{window.GoogleVideoMediaUrlReady=resolve;});window.SabrRequestTokenPromise=new Promise(resolve=>{window.SabrRequestTokenReady=resolve;});\n${base}`;

                    // Defines EarlyNewPlayerLoadVideo function that will reset the variables and promises
                    // Afterward, if the NewPlayerLoadVideo function isn’t ready yet, retry
                    base = `function EarlyNewPlayerLoadVideo(VideoId){if(window.SabrRequestTokenReady)window.SabrRequestTokenReady(Promise.reject("cancelled"));if(window.GoogleVideoMediaUrlReady)window.GoogleVideoMediaUrlReady(Promise.reject("cancelled"));window.SabrRequestToken=null;window.GoogleVideoMediaUrl=null;window.GoogleVideoMediaUrlPromise=new Promise(resolve=>{window.GoogleVideoMediaUrlReady=resolve;});window.SabrRequestTokenPromise=new Promise(resolve=>{window.SabrRequestTokenReady=resolve;});if(typeof NewPlayerLoadVideo==="function")return NewPlayerLoadVideo(VideoId);let i=setInterval(()=>{if(typeof NewPlayerLoadVideo==="function"){clearInterval(i);NewPlayerLoadVideo(VideoId)}},1)}\n${base}`;
                    // Youtube now requires embeds to send the referrer, which is the URL that loaded the player
                    // Fix the broken line in the old player so it sets it correctly
                    base = base.replace(
                        /this\.loaderUrl\s*=\s*U\s*\?\s*this\.J\s*\|\|\s*Ovs\(this\)\s*&&\s*U\.loaderUrl\s*\?\s*U\.loaderUrl\s*\|\|\s*""\s*:\s*this\.b2\s*:\s*this\.J\s*\|\|\s*Ovs\(this\)\s*&&\s*k\.loaderUrl\s*\?\s*n4\("",\s*k\.loaderUrl\)\s*:\s*this\.b2\s*;/,
                        'this.loaderUrl = document.referrer;'
                    );
                    // Extract the signatureTimestamp from the new base URL and replace the one in the old base with it
                    // This is something like a token, that Youtube uses to tell if you are making a valid request to their player endpoint
                    let timestamp = newBase.match(/signatureTimestamp:(\d+)/)?.[1];
                    base = base.replace(/signatureTimestamp:\d+/g, `signatureTimestamp:${timestamp}`);
                    // Under the line that makes the player request, also load the video in the new player by calling our function
                    base = base.replace(
                        /(C\.send\(\(O=U\.body\)!=null\?O:null\))/,
                        '$1;try{let ParsedVideoId=JSON.parse(U.body).videoId;if(ParsedVideoId!==undefined&&ParsedVideoId!==CurrentVideoId){EarlyNewPlayerLoadVideo(ParsedVideoId);CurrentVideoId=ParsedVideoId;}}catch{}'
                    );
                    // Make the video URL fetch function an async function and wait for the GoogleVideoMediaUrlPromise to resolve
                    // We do this, because each new player build changes the GoogleVideo URL generation algorythm
                    // Any old one doesn’t match what the server expects and results in a 403 forbidden error
                    base = base.replace(
                        /g\.V\.start=function\((\w+)\)\{(.*?)(\w+)=new Request\(\1,(\w+)\);/,
                        'g.V.start=async function($1){$2await GoogleVideoMediaUrlPromise;$1 = GoogleVideoMediaUrl;$1=new Request($1,$4);'
                    );
                    // After a request to the Youtube player endpoint completes, wait for the SabrRequestTokenPromise to resolve
                    // Youtube started to force SABR usage and because we copy the GoogleVideo URL from the new player, we also need to copy the SABR token belonging to it
                    base = base.replace(
                        /(function v\(\)\{)/,
                        'async $1try{let ParsedResponse=JSON.parse(C.response);if(ParsedResponse.playerConfig&&ParsedResponse.playerConfig.mediaCommonConfig&&ParsedResponse.playerConfig.mediaCommonConfig.mediaUstreamerRequestConfig)await SabrRequestTokenPromise;}catch{}'
                    );

                    // If its a Youtube player endpoint response, override the SABR token with the one from the new player
                    base = base.replace(
                        /(var C=JSON\.parse\(n\))/,
                        '$1;if(C.playerConfig&&C.playerConfig.mediaCommonConfig&&C.playerConfig.mediaCommonConfig.mediaUstreamerRequestConfig)C.playerConfig.mediaCommonConfig.mediaUstreamerRequestConfig.videoPlaybackUstreamerConfig=window.SabrRequestToken;'
                    );

                    // Fixes a livestream video buffering/looping issue
                    base = base.replace(
                        /if\(!Z\.info\.j\)\{/g,
                        'if(!Z.info.j && !(Z.info.S === 0 && Z.info.A8 >= 0 && Z.info.duration > 0 && Z.info.B > 0 && (k.TJ.isLive || k.TJ.isManifestless))){'
                    );
                }

                else {
                    // Youtube now requires a valid referrer when loading the video
                    // The reason we use example.net as a fixed referrer value is to avoid ad loading and edge cases on sites like Reddit
                    base = base.replace(
                        /this\.loaderUrl=[^;]+;/g,
                        'this.loaderUrl="https://example.net";'
                    );
                }

                // After the base is modified, inject it as a text content script
                let BaseScript = document.createElement('script');
                BaseScript.setAttribute('LightWork', '');
                BaseScript.textContent = base;
                // Set the name attribute
                BaseScript.setAttribute('name', 'player/base');
                document.body.appendChild(BaseScript);
                // Right after, remove it to prevent any further lag
                BaseScript.remove();
                // Inject the writeEmbed script to init the player
                let s6 = document.createElement('script');
                s6.setAttribute('LightWork', '');
                s6.textContent = `
                        writeEmbed();
                    `;
                document.body.appendChild(s6);
                // If the base failed to fetch, log it for debugging
            }).catch(error => {
                LightWork_error('Failed to fetch base.js. Loading the backup player... ' + error);
                // Try to init the backup player
                LightWork_createProxyIframe();
                FetchBases(true);
                if (typeof unsafeWindow !== "undefined") {
                    unsafeWindow.LightWork_fixUrlsForBackup();
                }
                else {
                    window.LightWork_fixUrlsForBackup();
                }
            });
        }

        // Inject the embed-player script
        let EmbedScript = document.createElement('script');
        EmbedScript.setAttribute('LightWork', '');
        EmbedScript.src = "https://www.youtube.com/s/embeds/02917fdd/www-embed-player.vflset/www-embed-player.js";
        // Set all the attributes
        EmbedScript.setAttribute('name', 'embed_client');
        EmbedScript.setAttribute('id', 'base-js');
        // when it loads
        EmbedScript.onload = () => {
            FetchBases(LightWork_useBackup);
        };
        document.body.appendChild(EmbedScript);

        // (can be removed)
        let s8 = document.createElement('script');
        s8.setAttribute('LightWork', '');
        s8.textContent = `
    if (window.ytcsi) {
      ytcsi.infoGel({
        serverTimeMs: 62.0
      }, '');
    }
        `
        document.body.appendChild(s8);

        // Inject the noscript element (mainly for compatibility reasons)
        let noscript = document.createElement('noscript');
        noscript.innerHTML = `
    <div class="player-unavailable">
        <h1 class="message">An error occurred.</h1>
        <div class="submessage">Unable to execute JavaScript.</div>
    </div>
    `;
        document.body.appendChild(noscript);
    }

    function LightWork_createProxyIframe() {
        // Youtube prevents loading the embedded player on a Youtube page, this gets around that
        let iframe = document.createElement('iframe');
        iframe.src = "https://example.net/?LightWorkPrivate=1";
        iframe.width = "0";
        iframe.height = "0";
        iframe.style.display = "none";
        // We can use document.head, because we do not need to see it or interact with it in any way
        // Its only for extracting the GoogleVideo URL and SABR token
        document.head.appendChild(iframe);
    }

    // Init the old player
    function LightWork_initOldPlayer() {
        // Inject the robots tag (also mainly for compatibility reasons)
        let meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
        // If the player does not exist
        if (!document.querySelector('#player')) {
            // Create it
            let player = document.createElement('div');
            player.id = "player";
            document.body.appendChild(player);
        }
        // If we are using the backup player, create the proxy iframe
        if (LightWork_useBackup) {
            LightWork_createProxyIframe();
        }
        // Inject the old styles & scripts
        LightWork_injectStyles();
        LightWork_injectScripts();
    }

    // Init the proxy iframe or LightWork Youtube private iframe
    function LightWork_privateInit() {
        // If we are running inside example.net
        if (window.location.href.includes('example.net')) {
            // Create the Youtube iframe
            let iframe = document.createElement('iframe');
            iframe.src = "https://www.youtube.com/embed/?LightWorkPrivate=1";
            iframe.width = "0";
            iframe.height = "0";
            iframe.style.display = "none";
            // Append it to head
            document.head.appendChild(iframe);
        }
        // Otherwise, if we are running inside youtube.com
        else if (window.location.href.includes('youtube.com')) {
            // Define a BrowserWindow variable
            let BrowserWindow = null;
            // If we are running inside a UserScript environment, point it to unsafeWindow
            if (typeof unsafeWindow !== "undefined") {
                BrowserWindow = unsafeWindow;
            }
            // Otherwise, point it to the normal browser window
            else {
                BrowserWindow = window;
            }
            // Indicates if we can change the media url or SABR token
            let ChangeMediaUrl = false;
            let ChangeSabrToken = false;
            // Go two windows upward (this is the old UI embedded player)
            // Define the NewPlayerLoadVideo globally on its window
            BrowserWindow.parent.parent.NewPlayerLoadVideo = function (VideoId) {
                // Retry every 1MS if the player does not exist yet (usually only takes a few retries)
                let i = setInterval(() => {
                    // Get the player in the CURRENT window (new player window)
                    let player = BrowserWindow.document.querySelector('#movie_player');
                    if (player) {
                        clearInterval(i);
                        // Load the video in it
                        player.loadVideoById(VideoId);
                        // Allow the change of media url and sabr token
                        ChangeMediaUrl = true;
                        ChangeSabrToken = true;
                    }
                }, 1);
            }

            // Save the original browser fetch
            let originalFetch = BrowserWindow.fetch;

            // Monkey patch the fetch() API used by the new player to fetch the video URL
            BrowserWindow.fetch = function (...args) {
                // Get the URl arg
                let url = String(args[0]?.url || args[0]);

                // If the url includes googlevideo.com (meaning its the video URL request)
                if (url.includes("googlevideo.com")) {

                    // If changing the stored media URL is allowed
                    if (ChangeMediaUrl) {
                        // disable it
                        ChangeMediaUrl = false;
                        // change the GoogleVideoMediaUrl on the top window (our variable)
                        BrowserWindow.parent.parent.GoogleVideoMediaUrl = url;
                        // resolve the promise
                        BrowserWindow.parent.parent.GoogleVideoMediaUrlReady(url);
                    }

                    // Act like the fetch succeeded and prevent it
                    return Promise.resolve();
                }

                // otherwise, if its a different fetch, let the original API handle it
                return originalFetch.apply(this, args);
            };

            // The Youtube player uses XMLHttpRequest to fetch the player endpoints
            // Monkey patch both send and open functions
            let originalOpen = BrowserWindow.XMLHttpRequest.prototype.open;
            let originalSend = BrowserWindow.XMLHttpRequest.prototype.send;

            // When the player opens the URL
            BrowserWindow.XMLHttpRequest.prototype.open = function (method, url, ...args) {
                // Store it as the player endpoint URL
                this.YoutubePlayerUrl = String(url);

                // Call the original open
                return originalOpen.call(this, method, url, ...args);
            };

            // When the player sends a request
            BrowserWindow.XMLHttpRequest.prototype.send = function (...args) {
                // Define the URL variable
                let xhr = this;
                let url = xhr.YoutubePlayerUrl;

                // If it includes youtubei/v1/player (which is the player endpoint)
                if (url.includes("youtubei/v1/player")) {
                    // If we are allowed to change the SABR token
                    if (ChangeSabrToken) {
                        // Disable it
                        ChangeSabrToken = false;
                        // Wait until the request loads
                        xhr.addEventListener("load", function () {
                            try {
                                // Try to extract the SABR token from it
                                let response = JSON.parse(this.responseText);
                                let token = response.playerConfig.mediaCommonConfig.mediaUstreamerRequestConfig.videoPlaybackUstreamerConfig;
                                // Change the top window variable
                                BrowserWindow.parent.parent.SabrRequestToken = token;
                                // Resolve the promise
                                BrowserWindow.parent.parent.SabrRequestTokenReady(token);
                                // If the extraction fails, log it for debugging
                            } catch (error) {
                                LightWork_error('Failed to get SABR config token ' + error);
                                // Resolve the promise (this prevents the player from infinitely loading and makes it show the error)
                                BrowserWindow.parent.parent.SabrRequestTokenReady(token);
                            }
                        });
                    }
                }

                // Call the original send
                return originalSend.apply(this, args);
            };
        }
    }

    // Init the old player UI
    function LightWork_embedInit(DocumentBody) {
        // Create a mutation observer
        let InitObserver = new MutationObserver(ms => ms.forEach(m =>
            m.addedNodes.forEach(n => {
                // if it has the LightWork attribute, ignore it
                if (n.nodeType === 1 && n.hasAttribute('LightWork')) {
                    return;
                }
                // If its a script and it isn’t the ytcfg config object, remove it
                if (n.nodeName === 'SCRIPT' && !n.textContent.includes('var ytcfg={')) {
                    n.remove();
                }
                // if its a body and doesn’t have the LightWorkBody id, copy the classes over to the LightWork body and remove it
                // disconnect the observer
                else if (n.nodeName === 'BODY' && n.id !== 'LightWorkBody') {
                    document.body.classList.add(...Object.values(n.classList));
                    n.remove();
                    InitObserver.disconnect();
                }
                // Remove the new player’s style sheets and similar elements
                else if (n.nodeName === 'LINK' && (n.rel === 'preconnect' || n.rel === 'canonical')) {
                    n.remove();
                }
            })
        ));
        // Connect the observer
        InitObserver.observe(document, { subtree: true, childList: true });
        // Remove any existing style, style sheets and script elements
        document.querySelectorAll('script[nonce],style[nonce],link[nonce]').forEach(n => {
            if (!(n.nodeName === 'SCRIPT' && n.textContent.includes('var ytcfg={'))) {
                n.remove();
            }
        });
        // If the body does not exist, create it and give it our unique ID
        if (!DocumentBody) {
            let body = document.createElement('body');
            body.id = "LightWorkBody";
            document.documentElement.appendChild(body);
        }
        // Init the old Youtube player
        LightWork_initOldPlayer();
    }

    // Init LightWork
    function LightWork_init() {
        // If we are running inside the new Youtube player, but not LightWorkPrivate or LightWorkIgnore
        if (window.location.href.includes('youtube.com/embed/') && !window.location.href.includes('?LightWorkPrivate=1') && !window.location.href.includes('?LightWorkIgnore=1')) {
            // If the base script already exists, throw a too late error and stop init (impossible to do anything at this point)
            if (document.querySelector('script[src*="base"]')) {
                LightWork_error('Too late! Please make sure to run LightWork at document-start.');
                // if retry injection is enabled, reload the page and retry
                if (LightWork_retryInjection) {
                    window.location.reload();
                }
                return;
            }
            // If document.body exists, tell the embed init function to not create a new body
            if (document.body) {
                LightWork_embedInit(true);
            }
            else {
                LightWork_embedInit(false);
            }
        }
        // Otherwise, if we are running inside a LightWorkPrivate iframe (ONLY RUNS IF THE BACKUP PLAYER IS ENABLED)
        else if ((window.self !== window.top) && window.location.href.includes('?LightWorkPrivate=1')) {
            // Init LightWorkPrivate
            LightWork_privateInit();
        }
        // Otherwise, if we are running inside a LightWorkIgnore page
        else if (window.location.href.includes('?LightWorkIgnore=1')) {
            // log it
            // console.warn('Ignoring the current embed URL. LightWork was not started.', window.location.href);
        }
    }

    // Call the init function
    LightWork_init();

    // End of Private NameSpace
})();