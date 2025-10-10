import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Visibility as ViewIcon,
  AutoAwesome as AIIcon,
  Article as ArticleIcon,
  BarChart as StatsIcon,
} from '@mui/icons-material';
import { cmsAPI } from '../../services/cmsAPI';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cms-tabpanel-${index}`}
      aria-labelledby={`cms-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CMSManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingArticle, setViewingArticle] = useState(null);
  
  // Form states
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    seo_title: '',
    meta_description: '',
    status: 'draft'
  });
  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    style: 'blog',
    target_audience: 'general'
  });

  useEffect(() => {
    loadArticles();
    loadStats();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await cmsAPI.getArticles();
      setArticles(response.articles || []);
    } catch (err) {
      setError('Failed to load articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await cmsAPI.getStats();
      setStats(response);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const resetArticleForm = () => {
    setArticleForm({
      title: '',
      content: '',
      excerpt: '',
      tags: '',
      seo_title: '',
      meta_description: '',
      status: 'draft'
    });
    setEditingArticle(null);
  };

  const openCreateDialog = () => {
    resetArticleForm();
    setArticleDialogOpen(true);
  };

  const openEditDialog = (article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      seo_title: article.seo_title || '',
      meta_description: article.meta_description || '',
      status: article.status || 'draft'
    });
    setArticleDialogOpen(true);
  };

  const openViewDialog = async (article) => {
    try {
      setLoading(true);
      // Get the full article content
      const fullArticle = await cmsAPI.getArticleById(article.id);
      setViewingArticle(fullArticle);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Failed to load article details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        ...articleForm,
        tags: articleForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      if (editingArticle) {
        await cmsAPI.updateArticle(editingArticle.id, payload);
      } else {
        await cmsAPI.createArticle(payload);
      }

      setArticleDialogOpen(false);
      resetArticleForm();
      loadArticles();
      loadStats();
    } catch (err) {
      setError(`Failed to ${editingArticle ? 'update' : 'create'} article`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishArticle = async (articleId) => {
    try {
      setLoading(true);
      await cmsAPI.publishArticle(articleId);
      loadArticles();
      loadStats();
    } catch (err) {
      setError('Failed to publish article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;
    
    try {
      setLoading(true);
      await cmsAPI.deleteArticle(articleToDelete.id);
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
      loadArticles();
      loadStats();
    } catch (err) {
      setError('Failed to delete article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    try {
      setLoading(true);
      const response = await cmsAPI.generateContent(generateForm);
      
      // Pre-fill the article form with generated content
      setArticleForm({
        title: response.title || '',
        content: response.content || '',
        excerpt: response.excerpt || '',
        tags: Array.isArray(response.tags) ? response.tags.join(', ') : '',
        seo_title: response.seo_title || '',
        meta_description: response.meta_description || '',
        status: 'draft'
      });
      
      setGenerateDialogOpen(false);
      setArticleDialogOpen(true);
    } catch (err) {
      setError('Failed to generate content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ px: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* CMS Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pt: 3 }}>
        <Typography variant="h5" component="h2">
          Content Management System
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AIIcon />}
            onClick={() => setGenerateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Generate Content
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            New Article
          </Button>
        </Box>
      </Box>

      {/* CMS Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<ArticleIcon />} label="Articles" />
          <Tab icon={<StatsIcon />} label="Statistics" />
        </Tabs>

        {/* Articles Tab */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{article.title}</Typography>
                        {article.excerpt && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {article.excerpt.substring(0, 100)}...
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={article.status} 
                          color={getStatusColor(article.status)}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{formatDate(article.created_at)}</TableCell>
                      <TableCell>{formatDate(article.updated_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => openViewDialog(article)}
                            color="info"
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => openEditDialog(article)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          {article.status === 'draft' && (
                            <IconButton 
                              size="small" 
                              onClick={() => handlePublishArticle(article.id)}
                              color="success"
                            >
                              <PublishIcon />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setArticleToDelete(article);
                              setDeleteDialogOpen(true);
                            }}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {articles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No articles found. Create your first article!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Articles
                  </Typography>
                  <Typography variant="h4">
                    {stats.total_articles || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Published
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.published_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Drafts
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.draft_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Recent (30 days)
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.recent_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Article Create/Edit Dialog */}
      <Dialog
        open={articleDialogOpen}
        onClose={() => {
          setArticleDialogOpen(false);
          resetArticleForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingArticle ? 'Edit Article' : 'Create New Article'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={articleForm.title}
              onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
              fullWidth
              required
            />
            <TextField
              label="Content"
              value={articleForm.content}
              onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
              fullWidth
              multiline
              rows={8}
              required
            />
            <TextField
              label="Excerpt"
              value={articleForm.excerpt}
              onChange={(e) => setArticleForm({...articleForm, excerpt: e.target.value})}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Tags (comma-separated)"
              value={articleForm.tags}
              onChange={(e) => setArticleForm({...articleForm, tags: e.target.value})}
              fullWidth
              placeholder="tag1, tag2, tag3"
            />
            <TextField
              label="SEO Title"
              value={articleForm.seo_title}
              onChange={(e) => setArticleForm({...articleForm, seo_title: e.target.value})}
              fullWidth
            />
            <TextField
              label="Meta Description"
              value={articleForm.meta_description}
              onChange={(e) => setArticleForm({...articleForm, meta_description: e.target.value})}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={articleForm.status}
                onChange={(e) => setArticleForm({...articleForm, status: e.target.value})}
                label="Status"
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setArticleDialogOpen(false);
            resetArticleForm();
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleArticleSubmit}
            disabled={!articleForm.title || !articleForm.content}
          >
            {editingArticle ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Content Generation Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate AI Content</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Content Prompt"
              value={generateForm.prompt}
              onChange={(e) => setGenerateForm({...generateForm, prompt: e.target.value})}
              fullWidth
              multiline
              rows={3}
              required
              placeholder="Describe what kind of article you want to generate..."
            />
            <FormControl fullWidth>
              <InputLabel>Style</InputLabel>
              <Select
                value={generateForm.style}
                onChange={(e) => setGenerateForm({...generateForm, style: e.target.value})}
                label="Style"
              >
                <MenuItem value="blog">Blog Post</MenuItem>
                <MenuItem value="article">Article</MenuItem>
                <MenuItem value="tutorial">Tutorial</MenuItem>
                <MenuItem value="news">News</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={generateForm.target_audience}
                onChange={(e) => setGenerateForm({...generateForm, target_audience: e.target.value})}
                label="Target Audience"
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="business_owners">Business Owners</MenuItem>
                <MenuItem value="students">Students</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleGenerateContent}
            disabled={!generateForm.prompt}
            startIcon={<AIIcon />}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Article</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDeleteArticle}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Article View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setViewingArticle(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Article Preview</Typography>
          {viewingArticle && (
            <Chip 
              label={viewingArticle.status} 
              color={getStatusColor(viewingArticle.status)}
              size="small" 
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {viewingArticle && (
            <Box sx={{ p: 4 }}>
              {/* Article Header */}
              <Box sx={{ mb: 4, borderBottom: '2px solid #f0f0f0', pb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {viewingArticle.title}
                </Typography>
                
                {viewingArticle.excerpt && (
                  <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {viewingArticle.excerpt}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {viewingArticle.tags && viewingArticle.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {viewingArticle.status === 'published' ? 'Published' : 'Created'}: {formatDate(viewingArticle.published_at || viewingArticle.created_at)}
                  {viewingArticle.updated_at && viewingArticle.updated_at !== viewingArticle.created_at && (
                    <> • Updated: {formatDate(viewingArticle.updated_at)}</>
                  )}
                </Typography>
              </Box>

              {/* Article Content */}
              <Box sx={{ 
                typography: 'body1', 
                lineHeight: 1.7,
                '& p': { mb: 2 },
                '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 3, mb: 2, fontWeight: 'bold' },
                '& ul, & ol': { mb: 2, pl: 3 },
                '& blockquote': { 
                  borderLeft: '4px solid #1976d2', 
                  pl: 2, 
                  ml: 0, 
                  mb: 2, 
                  fontStyle: 'italic',
                  color: 'text.secondary' 
                }
              }}>
                {viewingArticle.content.split('\n').map((paragraph, index) => {
                  if (paragraph.trim() === '') return <br key={index} />;
                  
                  // Simple markdown-like formatting
                  if (paragraph.startsWith('# ')) {
                    return (
                      <Typography key={index} variant="h4" component="h1" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                        {paragraph.substring(2)}
                      </Typography>
                    );
                  }
                  if (paragraph.startsWith('## ')) {
                    return (
                      <Typography key={index} variant="h5" component="h2" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                        {paragraph.substring(3)}
                      </Typography>
                    );
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <Typography key={index} variant="h6" component="h3" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                        {paragraph.substring(4)}
                      </Typography>
                    );
                  }
                  
                  return (
                    <Typography key={index} variant="body1" paragraph>
                      {paragraph}
                    </Typography>
                  );
                })}
              </Box>

              {/* SEO Information */}
              {(viewingArticle.seo_title || viewingArticle.meta_description) && (
                <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    SEO Information
                  </Typography>
                  {viewingArticle.seo_title && (
                    <Typography variant="body2" gutterBottom>
                      <strong>SEO Title:</strong> {viewingArticle.seo_title}
                    </Typography>
                  )}
                  {viewingArticle.meta_description && (
                    <Typography variant="body2">
                      <strong>Meta Description:</strong> {viewingArticle.meta_description}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setViewDialogOpen(false);
              setViewingArticle(null);
            }}
          >
            Close
          </Button>
          {viewingArticle && (
            <Button 
              variant="contained" 
              onClick={() => {
                setViewDialogOpen(false);
                openEditDialog(viewingArticle);
              }}
              startIcon={<EditIcon />}
            >
              Edit Article
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CMSManagement;