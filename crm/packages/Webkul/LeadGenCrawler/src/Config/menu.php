<?php

/**
 * Lead Gen Crawler menu entry — merged into Krayin's main menu config.
 *
 * Appears as "Crawl Jobs" in the sidebar between Leads (sort 2) and
 * Quotes (sort 3), so it's always visible near the top.
 */
return [
    [
        'key'        => 'crawler',
        'name'       => 'Crawl Jobs',
        'route'      => 'admin.crawler.index',
        'sort'       => 3,
        'icon-class' => 'icon-leads',
    ],
];
