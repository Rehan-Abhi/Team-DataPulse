import { useState, useEffect, useCallback } from 'react';
import api from './services/api';
import ChatWindow from './components/ChatWindow';
import { auth } from './firebase';

function YourCollege() {
    const [activeTab, setActiveTab] = useState('library');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filter State
    const [categoryFilter, setCategoryFilter] = useState('All');
    
    // Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        category: 'Physics',
        link: '',
        description: ''
    });

    // Discussion State
    const [posts, setPosts] = useState([]);
    const [postTypeFilter, setPostTypeFilter] = useState('All');
    const [showPostModal, setShowPostModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', type: 'Discussion' });
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [commentContent, setCommentContent] = useState('');

    // Lost & Found State
    const [lostItems, setLostItems] = useState([]);
    const [showLostModal, setShowLostModal] = useState(false);
    const [newLostItem, setNewLostItem] = useState({ title: '', location: '', type: 'Lost', description: '' });

    const [activeChat, setActiveChat] = useState(null); // { conversationId, targetName }
    const [showInbox, setShowInbox] = useState(false);
    const [myChats, setMyChats] = useState([]);

    const categories = ['Physics', 'Chemistry', 'Mathematics', 'Coding', 'Electronics', 'Mechanics', 'Humanities', 'Other'];
    const postTypes = ['Discussion', 'Announcement', 'GroupStudy', 'Question'];

    // Friends State
    const [friendsView, setFriendsView] = useState('mine'); // 'mine', 'search', 'requests'
    
    // Data Lists
    const [friendsList, setFriendsList] = useState([]);
    const [peers, setPeers] = useState([]);
    const [requests, setRequests] = useState([]);

    // Fetch Friends Logic
    const fetchMyFriends = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/friends/mine');
            setFriendsList(res.data);
        } catch (error) {
            console.error("Error fetching friends:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPeers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/friends/search');
            setPeers(res.data);
        } catch (error) {
            console.error("Error fetching peers:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get('/friends/requests');
            setRequests(res.data);
        } catch (error) {
            console.error("Error fetching requests:", error);
        }
    }, []);

    const sendRequest = async (targetId) => {
        try {
            await api.post(`/friends/request/${targetId}`);
            alert("Request sent!");
            fetchPeers(); // Refresh to update button state
        } catch (error) {
            console.error(error);
            alert("Failed to send request");
        }
    };

    const respondToRequest = async (requestId, action) => {
        try {
            await api.post('/friends/respond', { requestId, action });
            fetchRequests();
            fetchMyFriends(); // Update friends list if accepted
        } catch (error) {
            console.error(error);
            alert("Failed to respond");
        }
    };

    // Fetch Library
    const fetchLibrary = useCallback(async () => {
        setLoading(true);
        try {
            const query = categoryFilter === 'All' ? '' : `?category=${categoryFilter}`;
            const res = await api.get(`/library${query}`);
            setItems(res.data);
        } catch (error) {
            console.error("Error fetching library:", error);
        } finally {
            setLoading(false);
        }
    }, [categoryFilter]);

    // Fetch Discussion
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const query = postTypeFilter === 'All' ? '' : `?type=${postTypeFilter}`;
            const res = await api.get(`/discussion${query}`);
            setPosts(res.data);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    }, [postTypeFilter]);

    // Fetch Lost & Found
    const fetchLostFound = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/lostfound');
            setLostItems(res.data);
        } catch (error) {
            console.error("Error fetching lost items:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'library') fetchLibrary();
        if (activeTab === 'discussion') fetchPosts();
        if (activeTab === 'lostfound') fetchLostFound();
        
        if (activeTab === 'friends') {
            if (friendsView === 'mine') fetchMyFriends();
            if (friendsView === 'search') fetchPeers();
            if (friendsView === 'requests') fetchRequests();
        }
    }, [activeTab, friendsView, fetchLibrary, fetchPosts, fetchLostFound, fetchMyFriends, fetchPeers, fetchRequests]);

    const handleReportItem = async (e) => {
        e.preventDefault();
        try {
            await api.post('/lostfound', newLostItem);
            setShowLostModal(false);
            setNewLostItem({ title: '', location: '', type: 'Lost', description: '' });
            fetchLostFound();
        } catch (error) {
            console.error("Report item error:", error);
            alert("Failed to report item");
        }
    };

    const handleContactFinder = async (targetUid, itemName) => {
        try {
            const res = await api.post('/chat/start', { 
                targetUid, 
                relatedItemName: itemName 
            });
            setActiveChat({ 
                conversationId: res.data._id, 
                targetName: "Finder of " + itemName
            });
        } catch (error) {
            console.error(error);
            alert("Could not start chat");
        }
    };

    const fetchMyChats = async () => {
        try {
            const res = await api.get('/chat/mine');
            setMyChats(res.data);
            setShowInbox(true);
        } catch (error) {
            console.error("Fetch chats error:", error);
        }
    };
    
    const openChatFromInbox = (conv) => {
        const name = "Chat History"; 
        setActiveChat({
            conversationId: conv._id,
            targetName: name
        });
        setShowInbox(false);
    };

    const handleResolveItem = async (itemId) => {
        if (!window.confirm("Is this item resolved? It will be removed from the list.")) return;
        try {
            await api.put(`/lostfound/${itemId}/resolve`);
            fetchLostFound();
        } catch (error) {
            console.error(error);
            alert("Failed to update item");
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            await api.post('/library', newItem);
            setShowUploadModal(false);
            setNewItem({ title: '', category: 'Physics', link: '', description: '' });
            fetchLibrary();
        } catch (error) {
            console.error("Upload error:", error);
            const msg = error.response?.data?.error || error.message || "Failed to upload";
            alert(`Upload Failed: ${msg}`);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        try {
            await api.post('/discussion', newPost);
            setShowPostModal(false);
            setNewPost({ title: '', content: '', type: 'Discussion' });
            fetchPosts();
        } catch (error) {
            alert("Failed to create post. " + (error.response?.data?.error || error.message));
        }
    };

    const handleUpvote = async (postId) => {
        try {
            await api.put(`/discussion/${postId}/upvote`);
            fetchPosts(); // Refresh to show new upvote count
        } catch (error) {
            console.error("Upvote failed:", error);
        }
    };

    const handleComment = async (e, postId) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        try {
            await api.post(`/discussion/${postId}/comment`, { content: commentContent });
            setCommentContent('');
            fetchPosts();
        } catch (error) {
            console.error("Comment failed", error);
        }
    };

    const getTagColor = (type) => {
        switch(type) {
            case 'Announcement': return 'bg-red-100 text-red-800 border-red-200';
            case 'Question': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'GroupStudy': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto min-h-screen">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Your College Hub
                </h1>
                <p className="text-gray-500 mt-2">Connect, Share, and Grow with your Campus Peers</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'library' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    📚 Library
                </button>
                <button 
                    onClick={() => setActiveTab('discussion')}
                    className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'discussion' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    💬 Discussion
                </button>
                <button 
                    onClick={() => setActiveTab('lostfound')}
                    className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'lostfound' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    🔍 Lost & Found
                </button>
                <button 
                    onClick={() => setActiveTab('friends')}
                    className={`px-6 py-3 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'friends' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    👥 Friends
                </button>
            </div>


            {/* --- LIBRARY TAB --- */}
            {activeTab === 'library' && (
                <div className="animate-fade-in">
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Filter by:</span>
                            <select 
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="All">All Subjects</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
                        >
                            <span>⬆️</span> Upload Resource
                        </button>
                    </div>

                    {/* Resources Grid */}
                    {loading ? (
                        <div className="text-center py-20 text-gray-500">Loading Library...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <h3 className="text-xl font-bold text-gray-700">No resources found</h3>
                            <p className="text-gray-500 mt-2">Be the first to upload study material for your college!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(item => (
                                <div key={item._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">
                                        {item.category}
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 pr-12 mb-2 line-clamp-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
                                        {item.description || "No description provided."}
                                    </p>
                                    
                                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                                        <div className="text-xs text-gray-400">
                                            By <span className="text-blue-600 font-medium">{item.uploadedBy}</span>
                                        </div>
                                        <a 
                                            href={item.link} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1"
                                        >
                                            Open Link ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- DISCUSSION TAB --- */}
            {activeTab === 'discussion' && (
                <div className="animate-fade-in max-w-4xl mx-auto">
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                             <span className="text-gray-600 font-medium">Topic:</span>
                            <select 
                                value={postTypeFilter}
                                onChange={(e) => setPostTypeFilter(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="All">All Topics</option>
                                {postTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => setShowPostModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
                        >
                            <span>✏️</span> Start Discussion
                        </button>
                    </div>

                    {/* Posts Feed */}
                    {loading ? (
                         <div className="text-center py-20 text-gray-500">Loading Discussions...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <h3 className="text-xl font-bold text-gray-700">No discussions yet</h3>
                            <p className="text-gray-500 mt-2">Be the first to start a conversation!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map(post => (
                                <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                                    <div className="flex">
                                        {/* Upvote Column */}
                                        <div className="p-4 bg-gray-50 flex flex-col items-center gap-1 border-r border-gray-100 w-16">
                                            <button 
                                                onClick={() => handleUpvote(post._id)}
                                                className="text-gray-400 hover:text-orange-500 transition-colors text-2xl"
                                            >
                                                ▲
                                            </button>
                                            <span className="font-bold text-gray-700">{post.upvotes?.length || 0}</span>
                                        </div>

                                        {/* Content Column */}
                                        <div className="p-5 flex-1 cursor-pointer" onClick={() => setExpandedPostId(expandedPostId === post._id ? null : post._id)}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getTagColor(post.type)}`}>
                                                    {post.type}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Posted by {post.author?.name} • {new Date(post.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-2">{post.title}</h3>
                                            <p className="text-gray-600 text-sm whitespace-pre-line line-clamp-3">
                                                {expandedPostId === post._id ? post.content : post.content}
                                            </p>
                                            
                                            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1 hover:text-gray-700">
                                                    💬 {post.comments?.length || 0} Comments
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Comments Section */}
                                    {expandedPostId === post._id && (
                                        <div className="bg-gray-50 p-5 border-t border-gray-200 animate-fade-in">
                                            <form onSubmit={(e) => handleComment(e, post._id)} className="flex gap-2 mb-6">
                                                <input 
                                                    type="text" 
                                                    required
                                                    className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                                                    placeholder="Add a comment..."
                                                    value={commentContent}
                                                    onChange={(e) => setCommentContent(e.target.value)}
                                                />
                                                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">Reply</button>
                                            </form>

                                            <div className="space-y-3">
                                                {post.comments?.map((comment, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-xs text-gray-700">{comment.author?.name}</span>
                                                            <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">{comment.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            )}

            {/* --- LOST & FOUND TAB --- */}
            {activeTab === 'lostfound' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                        <div className="text-gray-600">
                            Find something? Lost something? Help each other out!
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={fetchMyChats}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
                            >
                                <span>📬</span> Inbox
                            </button>
                            <button 
                                onClick={() => setShowLostModal(true)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
                            >
                                <span>📢</span> Report Item
                            </button>
                        </div>
                    </div>

                    {loading ? (
                         <div className="text-center py-20 text-gray-500">Loading Items...</div>
                    ) : lostItems.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <h3 className="text-xl font-bold text-gray-700">No items reported</h3>
                            <p className="text-gray-500 mt-2">Everything seems to be in its place!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lostItems.map(item => (
                                <div key={item._id} className="bg-white rounded-xl shadow-md border-l-4 border-orange-400 p-5 hover:shadow-lg transition-all relative">
                                    <div className="absolute top-4 right-4 bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded uppercase">
                                        {item.type}
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-800 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                                        📍 {item.location} • {new Date(item.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                                        {item.description || "No description."}
                                    </p>
                                    
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Posted by {item.finder?.name}</span>
                                        {item.finder?.uid !== auth.currentUser?.uid && (
                                            <button 
                                                onClick={() => handleContactFinder(item.finder.uid, item.title)}
                                                className="text-blue-600 font-semibold text-sm hover:underline flex items-center gap-1"
                                            >
                                                💬 Contact
                                            </button>
                                        )}
                                        {item.finder?.uid === auth.currentUser?.uid && (
                                            <div className="flex gap-2">
                                                <span className="text-xs text-green-600 font-bold self-center">Your Post</span>
                                                <button 
                                                    onClick={() => handleResolveItem(item._id)}
                                                    className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-2 py-1 rounded border border-green-200"
                                                >
                                                    ✅ Mark Resolved
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            )}

            {/* --- FRIENDS TAB --- */}
            {activeTab === 'friends' && (
                <div className="animate-fade-in">
                     {/* Sub-Header / Toolbar */}
                     <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-green-100 gap-4">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setFriendsView('mine')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${friendsView === 'mine' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                My Friends
                            </button>
                            <button 
                                onClick={() => setFriendsView('search')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${friendsView === 'search' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Find Peers
                            </button>
                            <button 
                                onClick={() => setFriendsView('requests')}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${friendsView === 'requests' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'} relative`}
                            >
                                Requests
                                {requests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                        {requests.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        
                        <button 
                            onClick={fetchMyChats}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
                        >
                            <span>📬</span> Inbox
                        </button>
                    </div>

                    {/* View: My Friends */}
                    {friendsView === 'mine' && (
                        loading ? <div className="text-center py-20 text-gray-500">Loading Friends...</div> :
                        friendsList.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <h3 className="text-xl font-bold text-gray-700">No friends yet</h3>
                                <p className="text-gray-500 mt-2">Go to "Find Peers" to connect with others!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {friendsList.map(u => (
                                    <div key={u._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all flex items-center gap-4 relative overflow-hidden">
                                        {/* Status Indicator Bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${u.liveStatus?.state === 'busy' ? 'bg-red-500' : u.liveStatus?.state === 'free' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl overflow-hidden ml-2">
                                            {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover"/> : <span>👤</span>}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{u.displayName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-2.5 h-2.5 rounded-full ${u.liveStatus?.state === 'busy' ? 'bg-red-500' : u.liveStatus?.state === 'free' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                <span className="text-xs font-medium text-gray-600">
                                                    {u.liveStatus?.status || "Offline"}
                                                </span>
                                            </div>
                                            {u.liveStatus?.state === 'busy' && u.liveStatus.endTime && (
                                                <p className="text-[10px] text-gray-400 ml-5">Until {u.liveStatus.endTime}</p>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleContactFinder(u.firebaseUid, "Friends Chat")}
                                            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                                            title="Message"
                                        >
                                            💬
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* View: Find Peers */}
                    {friendsView === 'search' && (
                        loading ? <div className="text-center py-20 text-gray-500">Searching Peers...</div> :
                        peers.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <h3 className="text-xl font-bold text-gray-700">No new peers found</h3>
                                <p className="text-gray-500 mt-2">Everyone in your college is already your friend!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {peers.map(u => (
                                    <div key={u._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl overflow-hidden">
                                            {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover"/> : <span>👤</span>}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{u.displayName}</h3>
                                            <p className="text-xs text-gray-500">{u.branch || "Student"} • {u.semester ? `Sem ${u.semester}` : ""}</p>
                                        </div>
                                        
                                        {u.relation === 'sent' ? (
                                             <span className="text-xs font-bold text-gray-400 px-3 py-1 bg-gray-100 rounded-full">Pending</span>
                                        ) : u.relation === 'received' ? (
                                            <span className="text-xs font-bold text-green-600 px-3 py-1 bg-green-50 rounded-full">Check Requests</span>
                                        ) : (
                                            <button 
                                                onClick={() => sendRequest(u._id)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
                                            >
                                                Add Friend
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* View: Requests */}
                    {friendsView === 'requests' && (
                        requests.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <h3 className="text-xl font-bold text-gray-700">No pending requests</h3>
                            </div>
                        ) : (
                            <div className="max-w-xl mx-auto space-y-4">
                                {requests.map(req => (
                                    <div key={req._id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {req.from.photoURL ? <img src={req.from.photoURL} alt="" className="w-full h-full object-cover"/> : <span>👤</span>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.from.displayName}</h3>
                                                <p className="text-xs text-gray-500">Sent a friend request</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => respondToRequest(req._id, 'reject')}
                                                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                            >
                                                Ignore
                                            </button>
                                            <button 
                                                onClick={() => respondToRequest(req._id, 'accept')}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Active Chat Window */}
            {activeChat && (
                <ChatWindow 
                    conversationId={activeChat.conversationId}
                    targetName={activeChat.targetName}
                    onClose={() => setActiveChat(null)}
                />
            )}

            {/* Upload Modal (Library) */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Share Resource</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Physics Chapter 1 Notes"
                                    value={newItem.title}
                                    onChange={e => setNewItem({...newItem, title: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                <select 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newItem.category}
                                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Link (URL)</label>
                                <input 
                                    type="url" 
                                    required 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://drive.google.com/..."
                                    value={newItem.link}
                                    onChange={e => setNewItem({...newItem, link: e.target.value})}
                                />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg">
                                Upload Resource
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Post Modal (Discussion) */}
            {showPostModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Start Discussion</h3>
                            <button onClick={() => setShowPostModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                                <select 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500"
                                    value={newPost.type}
                                    onChange={e => setNewPost({...newPost, type: e.target.value})}
                                >
                                    {postTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Interesting title..."
                                    value={newPost.title}
                                    onChange={e => setNewPost({...newPost, title: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Content</label>
                                <textarea 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                                    placeholder="What's on your mind? (Markdown supported)"
                                    value={newPost.content}
                                    onChange={e => setNewPost({...newPost, content: e.target.value})}
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg">
                                Post to College
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {/* Report Lost Item Modal */}
            {showLostModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Report Item</h3>
                            <button onClick={() => setShowLostModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <form onSubmit={handleReportItem} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">I have...</label>
                                <select 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500"
                                    value={newLostItem.type}
                                    onChange={e => setNewLostItem({...newLostItem, type: e.target.value})}
                                >
                                    <option value="Lost">Lost something 😢</option>
                                    <option value="Found">Found something 🕵️</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="e.g. Blue Water Bottle"
                                    value={newLostItem.title}
                                    onChange={e => setNewLostItem({...newLostItem, title: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="e.g. Library 2nd Floor"
                                    value={newLostItem.location}
                                    onChange={e => setNewLostItem({...newLostItem, location: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea 
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                                    placeholder="Any distinguishing marks?"
                                    value={newLostItem.description}
                                    onChange={e => setNewLostItem({...newLostItem, description: e.target.value})}
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg">
                                Post Report
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
             {/* Inbox Modal */}
            {showInbox && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up h-[500px] flex flex-col">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">My Conversations</h3>
                            <button onClick={() => setShowInbox(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {myChats.length === 0 ? (
                                <p className="text-center text-gray-500 mt-10">No messages yet.</p>
                            ) : (
                                myChats.map(conv => (
                                    <div 
                                        key={conv._id} 
                                        onClick={() => openChatFromInbox(conv)}
                                        className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-gray-700">Conversation</span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(conv.lastMessageAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">
                                            {conv.messages[conv.messages.length - 1]?.text || "No messages"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default YourCollege;
