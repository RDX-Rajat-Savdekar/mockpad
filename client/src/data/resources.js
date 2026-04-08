export const RESOURCES = {
  leetcode: {
    label: 'LeetCode',
    patterns: [
      {
        name: 'Two Pointers',
        when: 'Sorted array, pair/triplet sum, palindrome, container problems',
        code: `def solve(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        elif total < target:
            left += 1
        else:
            right -= 1
    return []`,
      },
      {
        name: 'Sliding Window',
        when: 'Contiguous subarray/substring, fixed or variable window size',
        code: `def solve(s, k):
    left = 0
    window = {}
    result = 0
    for right in range(len(s)):
        c = s[right]
        window[c] = window.get(c, 0) + 1
        while len(window) > k:          # shrink condition
            window[s[left]] -= 1
            if window[s[left]] == 0:
                del window[s[left]]
            left += 1
        result = max(result, right - left + 1)
    return result`,
      },
      {
        name: 'Binary Search',
        when: 'Sorted array, monotonic condition, minimize/maximize over answer space',
        code: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# "Find first true" pattern (leftmost valid answer):
def first_true(lo, hi):
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
      },
      {
        name: 'BFS',
        when: 'Shortest path, level-order traversal, multi-source spread',
        code: `from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([(start, 0)])    # (node, distance)
    while queue:
        node, dist = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return dist`,
      },
      {
        name: 'DFS / Backtracking',
        when: 'All combinations/permutations, tree paths, constraint satisfaction',
        code: `def backtrack(start, path, result, candidates, target):
    if target == 0:
        result.append(path[:])
        return
    for i in range(start, len(candidates)):
        if candidates[i] > target:
            break
        path.append(candidates[i])
        backtrack(i + 1, path, result, candidates, target - candidates[i])
        path.pop()

result = []
candidates.sort()
backtrack(0, [], result, candidates, target)`,
      },
      {
        name: 'Dynamic Programming',
        when: 'Overlapping subproblems + optimal substructure',
        code: `# Top-down with memoization
from functools import lru_cache

def solve(n):
    @lru_cache(maxsize=None)
    def dp(i, j):
        if i == 0 or j == 0:
            return base_case_value
        return min(
            dp(i - 1, j),
            dp(i, j - 1),
        ) + cost[i][j]
    return dp(len(cost)-1, len(cost[0])-1)

# Bottom-up (1-D example — house robber)
def rob(nums):
    n = len(nums)
    if n == 1: return nums[0]
    dp = [0] * n
    dp[0], dp[1] = nums[0], max(nums[0], nums[1])
    for i in range(2, n):
        dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    return dp[-1]`,
      },
      {
        name: 'Heap / Top-K',
        when: 'K largest/smallest, merge K sorted, streaming median',
        code: `import heapq

# K largest
def k_largest(nums, k):
    return heapq.nlargest(k, nums)

# Running median with two heaps
class MedianFinder:
    def __init__(self):
        self.small = []   # max-heap (negate values)
        self.large = []   # min-heap

    def add(self, num):
        heapq.heappush(self.small, -num)
        heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def median(self):
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2.0`,
      },
      {
        name: 'Union-Find',
        when: 'Connected components, cycle detection, dynamic connectivity',
        code: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank   = [0] * n
        self.components = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        self.components -= 1
        return True`,
      },
      {
        name: 'Monotonic Stack',
        when: 'Next greater/smaller element, span problems, histogram area',
        code: `def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # indices, values are decreasing
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            idx = stack.pop()
            result[idx] = n
        stack.append(i)
    return result`,
      },
    ],
    tips: [
      'Clarify: input size, sorted?, duplicates?, what to return',
      'Always state the brute force first — then optimize',
      'Think aloud — the process matters more than the answer',
      'State time + space complexity for EVERY approach you mention',
      'Edge cases: empty input, single element, all same, negatives, overflow',
      'Write helper functions to keep the main logic readable',
    ],
  },

  behavioral: {
    label: 'Behavioral',
    star: [
      { label: 'S — Situation', desc: 'Set the scene: team size, timeline, business context' },
      { label: 'T — Task', desc: 'Your specific responsibility or the goal you owned' },
      { label: 'A — Action', desc: 'Step-by-step decisions YOU made (not "we")' },
      { label: 'R — Result', desc: 'Measurable outcome + what you learned or changed' },
    ],
    categories: [
      {
        name: 'Leadership',
        questions: [
          'Tell me about a time you led a team through a difficult challenge.',
          'Describe a situation where you had to influence without direct authority.',
          'Give an example of when you took ownership of something outside your scope.',
          'Tell me about a time you had to make a high-stakes decision with limited information.',
        ],
      },
      {
        name: 'Conflict & Pushback',
        questions: [
          'Describe a disagreement with a colleague and how you resolved it.',
          'Tell me about a time you pushed back on your manager\'s decision.',
          'Give an example of receiving critical feedback. How did you respond?',
          'Describe a time a stakeholder rejected your recommendation. What did you do?',
        ],
      },
      {
        name: 'Failure & Growth',
        questions: [
          'What is your biggest professional failure? What did you learn?',
          'Describe a project that did not go as planned. What would you do differently?',
          'Tell me about a time you missed a deadline.',
          'Give an example of a mistake you made and how you caught and fixed it.',
        ],
      },
      {
        name: 'Execution & Delivery',
        questions: [
          'Tell me about a time you delivered a project under a tight deadline.',
          'Describe how you handle competing priorities.',
          'Give an example of a process or system you improved and the impact.',
          'Tell me about the most technically complex project you have shipped.',
        ],
      },
      {
        name: 'Collaboration',
        questions: [
          'Describe a time you had to work with a difficult teammate.',
          'Tell me about a situation where you helped a colleague grow.',
          'Give an example of effective cross-functional collaboration you drove.',
          'How have you handled a team disagreement on technical direction?',
        ],
      },
    ],
  },

  'system-design': {
    label: 'System Design',
    checklist: [
      {
        step: '1. Requirements',
        items: [
          'Functional: core features — write them on the board',
          'Non-functional: latency SLA, availability %, consistency model',
          'Scale: DAU / MAU, read vs write ratio',
          'Out of scope: explicitly state what you are NOT building',
        ],
      },
      {
        step: '2. Capacity Estimates',
        items: [
          'QPS = DAU × avg_requests / 86400',
          'Storage per record × records per day × retention days',
          'Bandwidth = QPS × avg_payload_size',
          'Peak = 3× average for traffic spikes',
        ],
      },
      {
        step: '3. API Design',
        items: [
          'REST endpoints or gRPC methods for each core feature',
          'Request / response payloads',
          'Auth strategy (JWT, OAuth, API key)',
          'Pagination strategy for list endpoints',
        ],
      },
      {
        step: '4. Data Model',
        items: [
          'Entities and their relationships (draw the schema)',
          'SQL vs NoSQL — justify your choice',
          'Indexes for hot query patterns',
          'Primary key / partition key strategy',
        ],
      },
      {
        step: '5. High-Level Architecture',
        items: [
          'Client → CDN → Load Balancer → App Servers → DB',
          'Cache layer: what gets cached, TTL, eviction policy',
          'Async work: message queue (Kafka / SQS) + workers',
          'Storage: blob store (S3) for media/files',
        ],
      },
      {
        step: '6. Deep Dive',
        items: [
          'Walk through the critical read path end-to-end',
          'Walk through the critical write path end-to-end',
          'What breaks first at 10× scale?',
          'Sharding/partitioning strategy and hotspot handling',
        ],
      },
      {
        step: '7. Trade-offs',
        items: [
          'Consistency vs availability for your specific use case',
          'Why SQL/NoSQL given your access patterns',
          'What you would add with more time (search, analytics, etc.)',
        ],
      },
    ],
    concepts: [
      'Consistent hashing — add/remove nodes with minimal key remapping',
      'CAP theorem — Consistency + Availability + Partition tolerance: pick 2',
      'Read replicas — scale reads; write throughput still bottlenecks on primary',
      'Write-through vs write-behind cache — freshness vs write throughput trade-off',
      'Fan-out on write vs read — store per-user feed (write cost) vs compute on read',
      'Token bucket vs leaky bucket — bursty traffic ok vs smooth output rate',
      'Idempotency keys — retry-safe writes; store key + result with TTL',
      'Long-polling vs WebSocket vs SSE — complexity vs overhead trade-offs',
      'Two-phase commit — distributed transaction; expensive, avoid if possible',
      'Saga pattern — distributed transactions via compensating actions',
    ],
    common: [
      'URL Shortener (bit.ly)',
      'Twitter / News Feed',
      'Netflix / Video Streaming',
      'Uber / Ride Sharing',
      'WhatsApp / Chat',
      'Google Drive / File Storage',
      'Rate Limiter',
      'Web Crawler',
      'Search Autocomplete',
      'Notification Service',
      'Distributed Cache',
      'Payment System',
    ],
  },

  general: {
    label: 'Tips',
    tips: [
      { title: 'Think aloud', body: 'Narrate your thought process constantly. Silence is your biggest enemy.' },
      { title: 'Clarify before coding', body: 'Ask 2–3 scoping questions first. Show you think about requirements.' },
      { title: 'Brute force first', body: 'State the naive solution immediately, THEN optimize. Never jump to clever.' },
      { title: 'State complexity early', body: 'Say "this is O(n²) time, O(1) space" before the interviewer asks.' },
      { title: 'Trace a concrete example', body: 'Manually run your code on a small input before saying it\'s done.' },
      { title: 'Edge cases', body: 'Empty input, single element, duplicates, negatives, integer overflow, null.' },
      { title: 'Ask for hints gracefully', body: '"I\'m thinking of X — does that seem like the right direction?" is totally fine.' },
      { title: 'Recover visibly', body: 'If you make a mistake, say "let me catch that" and fix it calmly. Recovery is a signal.' },
    ],
  },
}
