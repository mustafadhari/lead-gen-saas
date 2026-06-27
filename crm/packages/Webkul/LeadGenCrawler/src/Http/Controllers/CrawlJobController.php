<?php

namespace Webkul\LeadGenCrawler\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

/**
 * Crawl Job Controller
 *
 * Manages Google Maps crawl jobs from within the Krayin CRM UI.
 *
 * How it works:
 *   1. The form submits a crawl request (business type + city + filter).
 *   2. This controller calls the Supabase REST API to INSERT a new row
 *      into the `crawl_jobs` table with status = 'pending'.
 *   3. The Node.js orchestrator polls that table every minute and picks
 *      up pending jobs — running the Playwright crawler automatically.
 *   4. Completed leads are pushed back into Krayin via the krayin.js
 *      integration as they are scraped.
 *
 * No extra server needed — Supabase acts as the shared message bus.
 */
class CrawlJobController extends Controller
{
    private string $supabaseUrl;
    private string $supabaseKey;

    public function __construct()
    {
        $this->supabaseUrl = rtrim(env('LEADGEN_SUPABASE_URL', ''), '/');
        $this->supabaseKey = env('LEADGEN_SUPABASE_ANON_KEY', '');
    }

    // ── Index — list crawl jobs ──────────────────────────────

    /**
     * Show the crawl job dashboard with a submission form and job history.
     */
    public function index()
    {
        $jobs    = $this->fetchJobs();
        $summary = $this->buildSummary($jobs);

        return view('lead-gen-crawler::admin.index', compact('jobs', 'summary'));
    }

    // ── Store — create a new crawl job ───────────────────────

    /**
     * Validate and submit a new crawl job to Supabase.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'business_type'  => 'required|string|min:2|max:100',
            'city'           => 'required|string|min:2|max:100',
            'website_filter' => 'required|in:any,has_website,no_website',
        ]);

        if ($validator->fails()) {
            return redirect()
                ->route('admin.crawler.index')
                ->withErrors($validator)
                ->withInput();
        }

        $payload = [
            'business_type'  => trim($request->business_type),
            'city'           => trim($request->city),
            'website_filter' => $request->website_filter,
            'status'         => 'pending',
        ];

        $response = Http::withHeaders($this->supabaseHeaders())
            ->post("{$this->supabaseUrl}/rest/v1/crawl_jobs", $payload);

        if ($response->failed()) {
            return redirect()
                ->route('admin.crawler.index')
                ->with('error', 'Failed to submit crawl job: ' . $response->body());
        }

        return redirect()
            ->route('admin.crawler.index')
            ->with('success', "Crawl job queued for \"{$payload['business_type']}\" in \"{$payload['city']}\". The crawler will pick it up within 1 minute.");
    }

    // ── Cancel ───────────────────────────────────────────────

    /**
     * Cancel a running or pending crawl job.
     */
    public function cancel(string $jobId)
    {
        $response = Http::withHeaders($this->supabaseHeaders())
            ->patch(
                "{$this->supabaseUrl}/rest/v1/crawl_jobs?id=eq.{$jobId}",
                ['status' => 'cancelled']
            );

        if ($response->failed()) {
            return redirect()
                ->route('admin.crawler.index')
                ->with('error', 'Failed to cancel job.');
        }

        return redirect()
            ->route('admin.crawler.index')
            ->with('success', 'Crawl job cancelled.');
    }

    // ── Supabase helpers ─────────────────────────────────────

    private function supabaseHeaders(): array
    {
        return [
            'apikey'        => $this->supabaseKey,
            'Authorization' => "Bearer {$this->supabaseKey}",
            'Content-Type'  => 'application/json',
            'Prefer'        => 'return=representation',
        ];
    }

    private function fetchJobs(): array
    {
        $response = Http::withHeaders($this->supabaseHeaders())
            ->get("{$this->supabaseUrl}/rest/v1/crawl_jobs", [
                'select'   => '*',
                'order'    => 'created_at.desc',
                'limit'    => 50,
            ]);

        return $response->successful() ? $response->json() : [];
    }

    private function buildSummary(array $jobs): array
    {
        return [
            'total'     => count($jobs),
            'pending'   => count(array_filter($jobs, fn($j) => $j['status'] === 'pending')),
            'running'   => count(array_filter($jobs, fn($j) => $j['status'] === 'running')),
            'completed' => count(array_filter($jobs, fn($j) => $j['status'] === 'completed')),
            'failed'    => count(array_filter($jobs, fn($j) => $j['status'] === 'failed')),
            'cancelled' => count(array_filter($jobs, fn($j) => $j['status'] === 'cancelled')),
            'leads'     => array_sum(array_column($jobs, 'leads_found')),
        ];
    }
}
