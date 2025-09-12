import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Alert,
    Tooltip,
    Grid,
    Tabs,
    Tab
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Key as KeyIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon,
    Schedule as ScheduleIcon,
    BarChart as BarChartIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import AnticLoader from '@/components/AnticLoader';
import ApiDocumentation from '@/components/ApiDocumentation';
import { apiKeysAnalyticsAPI } from '@/services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    permissions: string[];
    rateLimit: {
        requests: number;
        windowMs: number;
    };
    isActive: boolean;
    lastUsed?: string;
    usageCount: number;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
    messagesSent?: number;
}

interface UsageStats {
    totalKeys: number;
    activeKeys: number;
    totalUsage: number;
    recentUsage: number;
}

const PERMISSIONS = [
    { value: 'whatsapp:send', label: 'WhatsApp Send', color: '#42A5F5' },
    { value: 'telegram:send', label: 'Telegram Send', color: '#0088CC' },
    { value: 'mattermost:send', label: 'Mattermost Send', color: '#0072C6' },
    { value: 'messages:read', label: 'Messages Read', color: '#FF9800' },
    { value: 'status:read', label: 'Status Read', color: '#9C27B0' }
];


const ApiKeysPage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
    const [newApiKey, setNewApiKey] = useState<string>('');
    const [showNewApiKey, setShowNewApiKey] = useState(false);

    // Analytics state
    const [mode, setMode] = useState<'year' | 'month'>('year');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [seriesLoading, setSeriesLoading] = useState(false);
    const [seriesData, setSeriesData] = useState<any[]>([]);

    // Per-key usage dialog state
    const [usageDialogOpen, setUsageDialogOpen] = useState(false);
    const [usageKey, setUsageKey] = useState<ApiKey | null>(null);
    const [usageMode, setUsageMode] = useState<'year' | 'month'>('year');
    const [usageYear, setUsageYear] = useState<number>(new Date().getFullYear());
    const [usageLoading, setUsageLoading] = useState(false);
    const [usageSeries, setUsageSeries] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[],
        rateLimit: { requests: 100, windowMs: 3600000 },
        expiresAt: ''
    });

    useEffect(() => {
        fetchApiKeys();
        fetchStats();
        fetchSeries('year', selectedYear);
    }, []);

    useEffect(() => {
        fetchSeries(mode, selectedYear);
    }, [mode, selectedYear]);

    const fetchSeries = async (m: 'year' | 'month', year: number) => {
        setSeriesLoading(true);
        try {
            let from: Date;
            let to: Date;
            let bucket: 'month' | 'week' | 'rolling4x7';
            const now = new Date();
            if (m === 'year') {
                from = new Date(year, 0, 1);
                const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
                to = new Date(year, lastMonth + 1, 0, 23, 59, 59, 999);
                bucket = 'month';
            } else {
                // Last 4 weeks (4x7 days) ending today
                to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                from = new Date(to.getTime() - 4 * 7 * 24 * 60 * 60 * 1000 + 1);
                bucket = 'rolling4x7';
            }

            const data = await apiKeysAnalyticsAPI.getUsageSeries({
                from: from.toISOString(),
                to: to.toISOString(),
                mode: bucket,
            });

            // Build full list of periods (fill missing)
            let periods: string[] = [];
            if (bucket === 'month') {
                const limit = to.getMonth() + 1;
                periods = Array.from({ length: limit }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
            } else if (bucket === 'rolling4x7') {
                periods = ['W3', 'W2', 'W1', 'W0'];
            } else {
                periods = Array.from(new Set(data.map(d => d.period))).sort();
            }

            // Pivot to chart-friendly structure: periods as rows, apiKey ids as series
            // Aggregate total usage per period for global chart
            const totals = periods.map(p => ({
                period: p,
                total: data.filter(d => d.period === p).reduce((acc, cur) => acc + (cur.count || 0), 0)
            }));
            setSeriesData(totals);
        } catch (err) {
            console.error('Failed to fetch usage series', err);
        } finally {
            setSeriesLoading(false);
        }
    };

    const openUsageDialog = (key: ApiKey) => {
        setUsageKey(key);
        setUsageDialogOpen(true);
        fetchUsageSeries('year', usageYear, key.id);
    };

    useEffect(() => {
        if (usageDialogOpen && usageKey) {
            fetchUsageSeries(usageMode, usageYear, usageKey.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usageMode, usageYear]);

    const fetchUsageSeries = async (m: 'year' | 'month', year: number, keyId: string) => {
        setUsageLoading(true);
        try {
            let from: Date;
            let to: Date;
            let bucket: 'month' | 'week' | 'rolling4x7';
            const now = new Date();
            if (m === 'year') {
                from = new Date(year, 0, 1);
                const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
                to = new Date(year, lastMonth + 1, 0, 23, 59, 59, 999);
                bucket = 'month';
            } else {
                to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                from = new Date(to.getTime() - 4 * 7 * 24 * 60 * 60 * 1000 + 1);
                bucket = 'rolling4x7';
            }

            const data = await apiKeysAnalyticsAPI.getUsageSeries({
                from: from.toISOString(),
                to: to.toISOString(),
                mode: bucket,
                keyId
            });

            let periods: string[] = [];
            if (bucket === 'month') {
                const limit = to.getMonth() + 1;
                periods = Array.from({ length: limit }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
            } else if (bucket === 'rolling4x7') {
                periods = ['W3', 'W2', 'W1', 'W0'];
            } else {
                periods = Array.from(new Set(data.map(d => d.period))).sort();
            }

            const totals = periods.map(p => ({
                period: p,
                total: data.filter(d => d.period === p).reduce((acc, cur) => acc + (cur.count || 0), 0)
            }));
            setUsageSeries(totals);
        } catch (err) {
            console.error('Failed to fetch usage series (key)', err);
        } finally {
            setUsageLoading(false);
        }
    };

    const fetchApiKeys = async () => {
        try {
            const response = await fetch('/api/admin/api-keys', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setApiKeys(data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch API keys');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/api-keys/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleCreateApiKey = async () => {
        try {
            const response = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    ...formData,
                    expiresAt: formData.expiresAt || null
                })
            });

            const data = await response.json();
            if (data.success) {
                setNewApiKey(data.data.key);
                setShowNewApiKey(true);
                toast.success('API key created successfully');
                fetchApiKeys();
                fetchStats();
                resetForm();
            } else {
                toast.error(data.error?.message || 'Failed to create API key');
            }
        } catch (error) {
            toast.error('Failed to create API key');
        }
    };

    const handleUpdateApiKey = async () => {
        if (!selectedApiKey) return;

        try {
            const response = await fetch(`/api/admin/api-keys/${selectedApiKey.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    ...formData,
                    expiresAt: formData.expiresAt || null
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('API key updated successfully');
                fetchApiKeys();
                fetchStats();
                setEditDialogOpen(false);
                resetForm();
            } else {
                toast.error(data.error?.message || 'Failed to update API key');
            }
        } catch (error) {
            toast.error('Failed to update API key');
        }
    };

    const handleDeleteApiKey = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/api-keys/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                toast.success('API key deleted successfully');
                fetchApiKeys();
                fetchStats();
            } else {
                toast.error(data.error?.message || 'Failed to delete API key');
            }
        } catch (error) {
            toast.error('Failed to delete API key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            permissions: [],
            rateLimit: { requests: 100, windowMs: 3600000 },
            expiresAt: ''
        });
        setCreateDialogOpen(false);
        setEditDialogOpen(false);
        setSelectedApiKey(null);
    };

    // const handleCopyApiKey = async (apiKey: string) => {
    //     // Check if Clipboard API is available and we're in a secure context
    //     if (navigator.clipboard && window.isSecureContext) {
    //         try {
    //             await navigator.clipboard.writeText(apiKey);
    //             toast.success('API key copied to clipboard');
    //             return;
    //         } catch (error) {
    //             console.warn('Clipboard API failed, falling back to legacy method:', error);
    //         }
    //     }

    //     // Fallback method for all browsers and insecure contexts
    //     try {
    //         const textArea = document.createElement('textarea');
    //         textArea.value = apiKey;
    //         textArea.style.position = 'fixed';
    //         textArea.style.left = '-999999px';
    //         textArea.style.top = '-999999px';
    //         textArea.style.opacity = '0';
    //         textArea.setAttribute('readonly', '');
    //         document.body.appendChild(textArea);
            
    //         textArea.focus();
    //         textArea.select();
    //         textArea.setSelectionRange(0, 99999); // For mobile devices
            
    //         const successful = document.execCommand('copy');
    //         document.body.removeChild(textArea);
            
    //         if (successful) {
    //             toast.success('API key copied to clipboard');
    //         } else {
    //             throw new Error('Copy command failed');
    //         }
    //     } catch (fallbackError) {
    //         console.error('All copy methods failed:', fallbackError);
    //         // Show the API key in a prompt as last resort
    //         window.prompt('Copy the API key manually:', apiKey);
    //     }
    // };

    const openEditDialog = (apiKey: ApiKey) => {
        setSelectedApiKey(apiKey);
        setFormData({
            name: apiKey.name,
            permissions: apiKey.permissions,
            rateLimit: apiKey.rateLimit,
            expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().split('T')[0] : ''
        });
        setEditDialogOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatRateLimit = (rateLimit: { requests: number; windowMs: number }) => {
        const hours = rateLimit.windowMs / (1000 * 60 * 60);
        return `${rateLimit.requests}/${hours}h`;
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    if (loading) {
        return <AnticLoader fullScreen />;
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1976D2' }}>
                        API Keys
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage API keys for external applications
                    </Typography>
                </Box>
                {tabValue === 0 && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                            borderRadius: '12px',
                            px: 3,
                            py: 1.5,
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                        }}
                    >
                        Create API Key
                    </Button>
                )}
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Manage Keys" />
                    <Tab label="Usage Analytics" />
                    <Tab label="API Documentation" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {tabValue === 0 && (
                <>
                    {/* Stats Cards */}
                    {stats && (
                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <KeyIcon sx={{ color: '#1976D2', mr: 1 }} />
                                            <Typography variant="h6" fontWeight={600}>
                                                Total Keys
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" fontWeight={700} color="#1976D2">
                                            {stats.totalKeys}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <SecurityIcon sx={{ color: '#42A5F5', mr: 1 }} />
                                            <Typography variant="h6" fontWeight={600}>
                                                Active Keys
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" fontWeight={700} color="#42A5F5">
                                            {stats.activeKeys}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <SpeedIcon sx={{ color: '#FF9800', mr: 1 }} />
                                            <Typography variant="h6" fontWeight={600}>
                                                Total Usage
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" fontWeight={700} color="#FF9800">
                                            {stats.totalUsage.toLocaleString()}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <ScheduleIcon sx={{ color: '#9C27B0', mr: 1 }} />
                                            <Typography variant="h6" fontWeight={600}>
                                                24h Usage
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" fontWeight={700} color="#9C27B0">
                                            {stats.recentUsage.toLocaleString()}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* API Keys Table */}
                    <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                API Keys
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Key</TableCell>
                                            <TableCell>Permissions</TableCell>
                                            <TableCell>Rate Limit</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Usage</TableCell>
                                            <TableCell>Last Used</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {apiKeys.map((apiKey) => (
                                            <TableRow key={apiKey.id}>
                                                <TableCell>
                                                    <Typography fontWeight={600}>
                                                        {apiKey.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography variant="body2" fontFamily="monospace" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {apiKey.key}
                                                        </Typography>                  
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                        {apiKey.permissions.map((permission) => {
                                                            const perm = PERMISSIONS.find(p => p.value === permission);
                                                            return (
                                                                <Chip
                                                                    key={permission}
                                                                    label={perm?.label || permission}
                                                                    size="small"
                                                                    sx={{
                                                                        backgroundColor: perm?.color + '20',
                                                                        color: perm?.color,
                                                                        fontWeight: 600
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatRateLimit(apiKey.rateLimit)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={apiKey.isActive ? 'Active' : 'Inactive'}
                                                        color={apiKey.isActive ? 'success' : 'error'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {apiKey.usageCount.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={1}>
                                                        <Tooltip title="View Usage">
                                                            <IconButton size="small" color="primary" onClick={() => openUsageDialog(apiKey)}>
                                                                <BarChartIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Edit">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => openEditDialog(apiKey)}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteApiKey(apiKey.id)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Usage Analytics Tab */}
            {tabValue === 1 && (
                <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.08)', p: 2 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Messages per API Key</Typography>
                    <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                        <Button
                            variant={mode === 'year' ? 'contained' : 'outlined'}
                            onClick={() => setMode('year')}
                        >This Year (Monthly)</Button>
                        <Button
                            variant={mode === 'month' ? 'contained' : 'outlined'}
                            onClick={() => setMode('month')}
                        >This Month (Weekly)</Button>
                        <FormControl size="small" sx={{ width: 140, ml: 2 }}>
                            <InputLabel>Year</InputLabel>
                            <Select
                                label="Year"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ width: '100%', height: 360 }}>
                        {seriesLoading ? (
                            <Typography>Loading...</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={seriesData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.4} />
                                    <XAxis
                                        dataKey="period"
                                        tickFormatter={(val: string) => {
                                            if (val.startsWith('W')) {
                                                const n = Number(val.substring(1));
                                                return n === 0 ? 'Last 7d' : `${n}w ago`;
                                            }
                                            const [y, m] = val.split('-').map(Number);
                                            const dt = new Date(y, (m || 1) - 1, 1);
                                            return format(dt, 'MMMM');
                                        }}
                                    />
                                    <YAxis allowDecimals={false} />
                                    <RechartsTooltip
                                        formatter={(value: any) => [value, 'Messages']}
                                        labelFormatter={(label: string) => {
                                            if (label.startsWith('W')) {
                                                const n = Number(label.substring(1));
                                                return n === 0 ? 'Last 7 days' : `${n} weeks ago`;
                                            }
                                            const [y, m] = label.split('-').map(Number);
                                            return format(new Date(y, (m || 1) - 1, 1), 'MMMM yyyy');
                                        }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                                    <Bar dataKey="total" name="Total messages" fill="#1976d2" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </Card>
            )}

            {/* API Documentation Tab */}
            {tabValue === 2 && (
                <ApiDocumentation />
            )}

            {/* Create API Key Dialog */}
            <Dialog open={createDialogOpen} onClose={resetForm} maxWidth="md" fullWidth>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="API Key Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            required
                        />

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                            Permissions
                        </Typography>
                        <FormGroup>
                            {PERMISSIONS.map((permission) => (
                                <FormControlLabel
                                    key={permission.value}
                                    control={
                                        <Checkbox
                                            checked={formData.permissions.includes(permission.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        permissions: [...formData.permissions, permission.value]
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        permissions: formData.permissions.filter(p => p !== permission.value)
                                                    });
                                                }
                                            }}
                                        />
                                    }
                                    label={permission.label}
                                />
                            ))}
                        </FormGroup>

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                            Rate Limiting
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Requests"
                                    type="number"
                                    value={formData.rateLimit.requests}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        rateLimit: {
                                            ...formData.rateLimit,
                                            requests: parseInt(e.target.value) || 0
                                        }
                                    })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Window</InputLabel>
                                    <Select
                                        value={formData.rateLimit.windowMs}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            rateLimit: {
                                                ...formData.rateLimit,
                                                windowMs: e.target.value as number
                                            }
                                        })}
                                    >
                                        <MenuItem value={3600000}>1 Hour</MenuItem>
                                        <MenuItem value={86400000}>24 Hours</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <TextField
                            fullWidth
                            label="Expires At (Optional)"
                            type="date"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={resetForm}>Cancel</Button>
                    <Button
                        onClick={handleCreateApiKey}
                        variant="contained"
                        disabled={!formData.name || formData.permissions.length === 0}
                    >
                        Create API Key
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Per-Key Usage Dialog */}
            <Dialog open={usageDialogOpen} onClose={() => setUsageDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Usage for {usageKey?.name}</DialogTitle>
                <DialogContent>
                    <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                        <Button
                            variant={usageMode === 'year' ? 'contained' : 'outlined'}
                            onClick={() => setUsageMode('year')}
                        >This Year (Monthly)</Button>
                        <Button
                            variant={usageMode === 'month' ? 'contained' : 'outlined'}
                            onClick={() => setUsageMode('month')}
                        >This Month (Weekly)</Button>
                        <FormControl size="small" sx={{ width: 140, ml: 2 }}>
                            <InputLabel>Year</InputLabel>
                            <Select
                                label="Year"
                                value={usageYear}
                                onChange={(e) => setUsageYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ width: '100%', height: 300 }}>
                        {usageLoading ? (
                            <Typography>Loading...</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={usageSeries} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.4} />
                                    <XAxis
                                        dataKey="period"
                                        tickFormatter={(val: string) => {
                                            if (val.startsWith('W')) {
                                                const n = Number(val.substring(1));
                                                return n === 0 ? 'Last 7d' : `${n}w ago`;
                                            }
                                            const [y, m] = val.split('-').map(Number);
                                            const dt = new Date(y, (m || 1) - 1, 1);
                                            return format(dt, 'MMMM');
                                        }}
                                    />
                                    <YAxis allowDecimals={false} />
                                    <RechartsTooltip
                                        formatter={(value: any) => [value, 'Messages']}
                                        labelFormatter={(label: string) => {
                                            if (label.startsWith('W')) {
                                                const n = Number(label.substring(1));
                                                return n === 0 ? 'Last 7 days' : `${n} weeks ago`;
                                            }
                                            const [y, m] = label.split('-').map(Number);
                                            return format(new Date(y, (m || 1) - 1, 1), 'MMMM yyyy');
                                        }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                                    <Bar dataKey="total" name="Total messages" fill="#1976d2" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUsageDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit API Key Dialog */}
            <Dialog open={editDialogOpen} onClose={resetForm} maxWidth="md" fullWidth>
                <DialogTitle>Edit API Key</DialogTitle>
                <DialogContent>
                    {/* Similar form as create dialog */}
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="API Key Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            required
                        />

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                            Permissions
                        </Typography>
                        <FormGroup>
                            {PERMISSIONS.map((permission) => (
                                <FormControlLabel
                                    key={permission.value}
                                    control={
                                        <Checkbox
                                            checked={formData.permissions.includes(permission.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        permissions: [...formData.permissions, permission.value]
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        permissions: formData.permissions.filter(p => p !== permission.value)
                                                    });
                                                }
                                            }}
                                        />
                                    }
                                    label={permission.label}
                                />
                            ))}
                        </FormGroup>

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                            Rate Limiting
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Requests"
                                    type="number"
                                    value={formData.rateLimit.requests}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        rateLimit: {
                                            ...formData.rateLimit,
                                            requests: parseInt(e.target.value) || 0
                                        }
                                    })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Window</InputLabel>
                                    <Select
                                        value={formData.rateLimit.windowMs}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            rateLimit: {
                                                ...formData.rateLimit,
                                                windowMs: e.target.value as number
                                            }
                                        })}
                                    >
                                        <MenuItem value={3600000}>1 Hour</MenuItem>
                                        <MenuItem value={86400000}>24 Hours</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <TextField
                            fullWidth
                            label="Expires At (Optional)"
                            type="date"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={resetForm}>Cancel</Button>
                    <Button
                        onClick={handleUpdateApiKey}
                        variant="contained"
                        disabled={!formData.name || formData.permissions.length === 0}
                    >
                        Update API Key
                    </Button>
                </DialogActions>
            </Dialog>

            {/* New API Key Display Dialog */}
            <Dialog open={showNewApiKey} onClose={() => setShowNewApiKey(false)} maxWidth="sm" fullWidth>
                <DialogTitle>API Key Created Successfully</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Save this API key securely. It will not be shown again!
                    </Alert>
                    <Box
                        sx={{
                            p: 2,
                            backgroundColor: '#f5f5f5',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            position: 'relative'
                        }}
                    >
                        {newApiKey}
                        <Tooltip title="Copy API Key">
                            <IconButton
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                                onClick={() => copyToClipboard(newApiKey)}
                            >
                                <CopyIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNewApiKey(false)} variant="contained">
                        I've Saved It
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApiKeysPage;
