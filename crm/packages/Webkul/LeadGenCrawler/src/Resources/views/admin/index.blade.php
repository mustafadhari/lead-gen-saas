<x-admin::layouts>
    <x-slot:title>
        Crawl Jobs — Lead Gen
    </x-slot>

@push('styles')
<style>
    /* ── Crawl Job Dashboard Styles ───────────────────────── */
    .crawler-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 1.5rem;
        color: #fff;
        position: relative;
        overflow: hidden;
    }
    .crawler-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(83, 146, 255, 0.15) 0%, transparent 70%);
        border-radius: 50%;
    }
    .crawler-header h1 {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0 0 0.25rem;
        position: relative;
    }
    .crawler-header p {
        margin: 0;
        opacity: 0.75;
        font-size: 0.92rem;
        position: relative;
    }

    /* ── Stats bar ─────────────────────────────────────────── */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .stat-card {
        background: #fff;
        border-radius: 10px;
        padding: 1.25rem 1rem;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,.06);
        border: 1px solid #f0f0f0;
        transition: transform .15s, box-shadow .15s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.1); }
    .stat-card .stat-num {
        font-size: 2rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: .3rem;
    }
    .stat-card .stat-label { font-size: 0.76rem; color: #888; text-transform: uppercase; letter-spacing: .04em; }
    .stat-card.total   .stat-num { color: #374151; }
    .stat-card.pending .stat-num { color: #d97706; }
    .stat-card.running .stat-num { color: #3b82f6; }
    .stat-card.done    .stat-num { color: #10b981; }
    .stat-card.failed  .stat-num { color: #ef4444; }
    .stat-card.leads   .stat-num { color: #8b5cf6; }

    /* ── Form card ─────────────────────────────────────────── */
    .form-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,.07);
        border: 1px solid #eee;
        padding: 1.75rem 2rem;
        margin-bottom: 1.5rem;
    }
    .form-card h2 { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.25rem; color: #111; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; }
    .form-group { flex: 1; min-width: 160px; }
    .form-group label { display: block; font-size: 0.82rem; font-weight: 600; color: #555; margin-bottom: .4rem; }
    .form-group input,
    .form-group select {
        width: 100%;
        padding: .6rem .9rem;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.92rem;
        background: #fafafa;
        transition: border-color .15s, box-shadow .15s;
        outline: none;
        color: #1a1a1a;
    }
    .form-group input:focus,
    .form-group select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,.15);
        background: #fff;
    }
    .btn-launch {
        padding: .65rem 1.75rem;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform .15s, box-shadow .15s;
        white-space: nowrap;
    }
    .btn-launch:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,.4); }
    .btn-launch:active { transform: translateY(0); }

    /* ── Alerts ────────────────────────────────────────────── */
    .alert {
        padding: .85rem 1.25rem;
        border-radius: 8px;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: .6rem;
    }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-error   { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* ── Jobs table ────────────────────────────────────────── */
    .jobs-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,.07);
        border: 1px solid #eee;
        overflow: hidden;
    }
    .jobs-card-header {
        padding: 1.25rem 1.75rem;
        border-bottom: 1px solid #f3f4f6;
        font-weight: 700;
        font-size: 1rem;
        color: #111;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .jobs-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .jobs-table th {
        padding: .75rem 1rem;
        background: #f9fafb;
        text-align: left;
        font-size: 0.76rem;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: .05em;
        border-bottom: 1px solid #f0f0f0;
    }
    .jobs-table td {
        padding: .9rem 1rem;
        border-bottom: 1px solid #f9fafb;
        color: #374151;
        vertical-align: middle;
    }
    .jobs-table tr:last-child td { border-bottom: none; }
    .jobs-table tr:hover td { background: #f9fafb; }

    /* ── Status badges ─────────────────────────────────────── */
    .badge {
        display: inline-flex;
        align-items: center;
        gap: .3rem;
        padding: .25rem .7rem;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: capitalize;
    }
    .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
    .badge-pending  { background: #fef3c7; color: #92400e; }
    .badge-pending::before  { background: #d97706; }
    .badge-running  { background: #dbeafe; color: #1e40af; animation: pulse 1.5s infinite; }
    .badge-running::before  { background: #3b82f6; }
    .badge-completed{ background: #d1fae5; color: #065f46; }
    .badge-completed::before { background: #10b981; }
    .badge-failed   { background: #fee2e2; color: #991b1b; }
    .badge-failed::before   { background: #ef4444; }
    .badge-cancelled{ background: #f3f4f6; color: #6b7280; }
    .badge-cancelled::before{ background: #9ca3af; }

    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }

    /* ── Cancel button ─────────────────────────────────────── */
    .btn-cancel {
        padding: .3rem .8rem;
        border: 1px solid #fca5a5;
        border-radius: 6px;
        background: #fff;
        color: #dc2626;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
    }
    .btn-cancel:hover { background: #fee2e2; }

    .empty-state { padding: 3rem; text-align: center; color: #9ca3af; }
    .empty-state .icon { font-size: 2.5rem; margin-bottom: .75rem; }

    .auto-refresh { font-size: 0.78rem; color: #9ca3af; }
</style>
@endpush


<div class="container" style="max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem;">

    {{-- Header --}}
    <div class="crawler-header">
        <h1>🕷 Lead Gen Crawler</h1>
        <p>Launch Google Maps crawls and manage your lead pipeline — all from within the CRM.</p>
    </div>

    {{-- Flash messages --}}
    @if(session('success'))
        <div class="alert alert-success">✅ {{ session('success') }}</div>
    @endif
    @if(session('error'))
        <div class="alert alert-error">❌ {{ session('error') }}</div>
    @endif
    @if($errors->any())
        <div class="alert alert-error">
            <div>
                @foreach($errors->all() as $error)
                    <div>• {{ $error }}</div>
                @endforeach
            </div>
        </div>
    @endif

    {{-- Stats --}}
    <div class="stats-grid">
        <div class="stat-card total">
            <div class="stat-num">{{ $summary['total'] }}</div>
            <div class="stat-label">Total Jobs</div>
        </div>
        <div class="stat-card pending">
            <div class="stat-num">{{ $summary['pending'] }}</div>
            <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card running">
            <div class="stat-num">{{ $summary['running'] }}</div>
            <div class="stat-label">Running</div>
        </div>
        <div class="stat-card done">
            <div class="stat-num">{{ $summary['completed'] }}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card failed">
            <div class="stat-num">{{ $summary['failed'] }}</div>
            <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card leads">
            <div class="stat-num">{{ $summary['leads'] }}</div>
            <div class="stat-label">Leads Found</div>
        </div>
    </div>

    {{-- New Crawl Job Form --}}
    <div class="form-card">
        <h2>🚀 Launch a New Crawl</h2>
        <form method="POST" action="{{ route('admin.crawler.store') }}">
            @csrf
            <div class="form-row">
                <div class="form-group">
                    <label for="business_type">Business Type</label>
                    <input
                        type="text"
                        id="business_type"
                        name="business_type"
                        placeholder="e.g. plumber, dentist, restaurant"
                        value="{{ old('business_type') }}"
                        required
                    >
                </div>
                <div class="form-group">
                    <label for="city">City / Location</label>
                    <input
                        type="text"
                        id="city"
                        name="city"
                        placeholder="e.g. Austin TX, Mumbai India"
                        value="{{ old('city') }}"
                        required
                    >
                </div>
                <div class="form-group" style="max-width: 200px;">
                    <label for="website_filter">Website Filter</label>
                    <select id="website_filter" name="website_filter">
                        <option value="any" {{ old('website_filter', 'any') === 'any' ? 'selected' : '' }}>Any</option>
                        <option value="no_website" {{ old('website_filter') === 'no_website' ? 'selected' : '' }}>No Website Only</option>
                        <option value="has_website" {{ old('website_filter') === 'has_website' ? 'selected' : '' }}>Has Website Only</option>
                    </select>
                </div>
                <div>
                    <button type="submit" class="btn-launch">⚡ Launch Crawl</button>
                </div>
            </div>
        </form>
    </div>

    {{-- Jobs Table --}}
    <div class="jobs-card">
        <div class="jobs-card-header">
            <span>Recent Crawl Jobs</span>
            <span class="auto-refresh" id="refresh-timer">Auto-refreshes in <span id="countdown">30</span>s</span>
        </div>

        @if(count($jobs) === 0)
            <div class="empty-state">
                <div class="icon">📭</div>
                <div>No crawl jobs yet. Launch your first crawl above.</div>
            </div>
        @else
            <table class="jobs-table">
                <thead>
                    <tr>
                        <th>Business Type</th>
                        <th>City</th>
                        <th>Filter</th>
                        <th>Status</th>
                        <th>Leads Found</th>
                        <th>Created</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($jobs as $job)
                    <tr>
                        <td><strong>{{ $job['business_type'] }}</strong></td>
                        <td>{{ $job['city'] }}</td>
                        <td style="font-size:.8rem; color:#6b7280;">
                            {{ str_replace('_', ' ', $job['website_filter'] ?? 'any') }}
                        </td>
                        <td>
                            <span class="badge badge-{{ $job['status'] }}">
                                {{ $job['status'] }}
                            </span>
                        </td>
                        <td>
                            @if(isset($job['leads_found']) && $job['leads_found'] > 0)
                                <strong style="color:#8b5cf6;">{{ $job['leads_found'] }}</strong>
                            @else
                                <span style="color:#d1d5db;">—</span>
                            @endif
                        </td>
                        <td style="color:#9ca3af; font-size:.82rem;">
                            {{ \Carbon\Carbon::parse($job['created_at'])->format('M j, Y g:i A') }}
                        </td>
                        <td>
                            @if(in_array($job['status'], ['pending', 'running']))
                                <form method="POST" action="{{ route('admin.crawler.cancel', $job['id']) }}" style="margin:0;" onsubmit="return confirm('Cancel this crawl job?')">
                                    @csrf
                                    <button type="submit" class="btn-cancel">Cancel</button>
                                </form>
                            @endif
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

</div>
</x-admin::layouts>

@push('scripts')
<script>
    // Auto-refresh the page every 30 seconds if there are active jobs
    let countdown = 30;
    const hasActiveJobs = {{ (($summary['pending'] + $summary['running']) > 0) ? 'true' : 'false' }};

    if (hasActiveJobs) {
        const timer = setInterval(() => {
            countdown--;
            const el = document.getElementById('countdown');
            if (el) el.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(timer);
                location.reload();
            }
        }, 1000);
    } else {
        const refreshEl = document.getElementById('refresh-timer');
        if (refreshEl) refreshEl.style.display = 'none';
    }
</script>
@endpush
