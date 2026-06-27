<?php

namespace Webkul\LeadGenCrawler\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

/**
 * Lead Gen Crawler Service Provider
 *
 * Registers the custom crawl-job trigger module inside Krayin CRM.
 * This module lets the team launch new Google Maps crawls directly
 * from within the CRM UI — no external dashboard needed.
 */
class LeadGenCrawlerServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any package services.
     */
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../Routes/admin-routes.php');

        $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'lead-gen-crawler');

        $this->mergeConfigFrom(
            __DIR__ . '/../Config/menu.php',
            'menu.admin'
        );
    }

    /**
     * Register any package services.
     */
    public function register(): void
    {
        //
    }
}
