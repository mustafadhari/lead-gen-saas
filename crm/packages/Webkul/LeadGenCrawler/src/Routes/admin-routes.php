<?php

use Illuminate\Support\Facades\Route;
use Webkul\LeadGenCrawler\Http\Controllers\CrawlJobController;

/*
 * Lead Gen Crawler Routes
 *
 * These routes are loaded inside the Krayin admin middleware group
 * so authentication is enforced automatically.
 */
Route::group([
    'prefix'     => config('app.admin_path', 'admin'),
    'middleware' => ['web', 'admin_locale', 'user'],
], function () {
    Route::controller(CrawlJobController::class)->prefix('crawler')->group(function () {
        // Crawl job dashboard — lists past/active jobs
        Route::get('/', 'index')->name('admin.crawler.index');

        // Submit a new crawl job
        Route::post('/', 'store')->name('admin.crawler.store');

        // Cancel a running crawl job
        Route::post('/{jobId}/cancel', 'cancel')->name('admin.crawler.cancel');
    });
});
