# AplyEase - Job Application Management Portal

A comprehensive web application for managing job applications with role-based access control for Administrators, Employees, and Clients.

## 🚀 Features Overview

### **For Administrators**
- **User Management**: Create, edit, and manage all users (Admin, Employee, Client)
- **Dashboard Analytics**: View comprehensive statistics and insights
- **Application Tracking**: Monitor all job applications across the platform
- **Client Applications Limit**: Set and manage "Applications Left" for clients
- **Export Data**: Download application data as CSV files

### **For Employees**
- **Submit Applications**: Create new job applications for clients
- **Track Earnings**: Earn $0.20 per application (when meeting daily target of 15+ applications)
- **Application Management**: View and update your submitted applications
- **Performance Stats**: Monitor your application success rates and progress

### **For Clients**
- **Application Monitoring**: Track all applications submitted for your company
- **Applications Left**: Monitor remaining application quota
- **Status Updates**: Update application statuses
- **Performance Analytics**: View hiring success rates and statistics

## 👥 User Roles & Permissions

### **Administrator**
- Full system access
- User management (create, edit, disable users)
- View all applications and statistics
- Set client application limits
- Export data

### **Employee**
- Submit job applications for clients
- View and edit own applications
- Track earnings ($0.20 per application when meeting daily target)
- View personal performance statistics

### **Client**
- View applications submitted for their company
- Update application statuses
- Monitor remaining application quota
- View hiring statistics

## 📋 Detailed Feature Guide

### **Administrator Features**

#### **User Management**
1. **Access**: Navigate to "User Management" from the admin dashboard
2. **Create New User**:
   - Click "Add User" button
   - Fill in required fields (Name, Email, Role, Password)
   - For **CLIENT** users: Set "Applications Left" quota
   - Click "Create User"

3. **Edit Existing User**:
   - Click the edit icon (✏️) next to any user
   - Modify fields as needed
   - For clients: Update "Applications Left" count
   - Click "Save Changes"

4. **Disable User**:
   - Click the disable icon (🚫) next to any user
   - User will be marked as inactive

#### **Dashboard Analytics**
- **Total Applications**: Overall count of all applications
- **Active Employees**: Number of active employee accounts
- **Hired This Month**: Successful hires in current month
- **Pending Review**: Applications awaiting status updates

#### **Application Management**
- View all applications across the platform
- Filter by client, employee, status, or date range
- Export application data to CSV format

### **Employee Features**

#### **Submitting Applications**
1. **Access**: Click "Add Application" from the employee dashboard
2. **Fill Application Form**:
   - **Client**: Select the client company
   - **Job Title**: Enter the position title
   - **Company Name**: Enter the hiring company
   - **Location**: Job location (optional)
   - **Portal**: Job board or application portal (optional)
   - **Job Link**: Direct link to the job posting (optional)
   - **Job Page**: Application page URL (optional)
   - **Resume**: Upload or link to resume (optional)
   - **Mail Sent**: Check if follow-up email was sent
   - **Notes**: Additional comments or notes
3. **Submit**: Click "Submit Application"

#### **Earnings Tracking**
- **Rate**: $0.20 per application (when meeting daily target of 15+ applications)
- **Display**: Shown on dashboard as "Earnings" card
- **Calculation**: Automatically calculated based on total applications

#### **Application Management**
- View all your submitted applications
- Update application details (except client assignment)
- Track application status changes

#### **Performance Statistics**
- **My Applications**: Total applications submitted
- **In Progress**: Applications currently being processed
- **Success Rate**: Percentage of successful applications
- **Earnings**: Total earnings from applications

### **Client Features**

#### **Application Monitoring**
- View all applications submitted for your company
- Filter applications by status, date, or employee
- Track application progress through the hiring pipeline

#### **Applications Left Tracking**
- **Display**: Shown as the first card on your dashboard
- **Decrement**: Automatically decreases by 1 when applications are submitted
- **Minimum**: Never goes below 0
- **Management**: Admins can increase your quota as needed

#### **Status Updates**
- Update application statuses to reflect current progress
- Available statuses:
  - **Applied**: Initial application submitted
  - **Screening**: Under initial review
  - **Interview**: Interview scheduled or completed
  - **Offer**: Job offer extended
  - **Hired**: Successfully hired
  - **Rejected**: Application not selected
  - **On Hold**: Temporarily paused

#### **Performance Analytics**
- **Total Applications**: All applications for your company
- **In Progress**: Applications currently being processed
- **Interviews**: Applications that reached interview stage
- **Hired**: Successfully hired candidates
- **Success Rate**: Percentage of applications that resulted in hires

## 🔧 Technical Features

### **Authentication & Security**
- JWT-based authentication for secure access
- Role-based access control (RBAC)
- Session management with automatic logout
- Password hashing for security

### **Data Management**
- Real-time application tracking
- Automatic status updates
- CSV export functionality
- Comprehensive filtering and search

### **User Interface**
- Responsive design for desktop and mobile
- Intuitive navigation
- Real-time updates
- Professional dashboard layouts

## 📊 Application Status Workflow

1. **Applied** → Employee submits application
2. **Screening** → Client reviews initial application
3. **Interview** → Client schedules/conducts interview
4. **Offer** → Client extends job offer
5. **Hired** → Candidate accepts offer
6. **Rejected** → Application not selected
7. **On Hold** → Application temporarily paused

## 🎯 Best Practices

### **For Employees**
- Submit applications promptly after job postings
- Include detailed notes for better tracking
- Mark "Mail Sent" when follow-up emails are sent
- Update application details as needed

### **For Clients**
- Regularly update application statuses
- Monitor your "Applications Left" quota
- Contact admin if you need more application slots
- Review applications in a timely manner

### **For Administrators**
- Regularly review user activity
- Monitor application success rates
- Adjust client quotas based on needs
- Export data for reporting purposes

## 🔗 Quick Links

- **Dashboard**: View your role-specific overview
- **Applications**: Manage job applications
- **User Management**: Admin-only user administration
- **Export**: Download application data (Admin/Employee)

## 📞 Support

For technical support or questions about features:
- Contact your system administrator
- Check the user management section for account issues
- Review this documentation for feature explanations

---

**AplyEase** - Streamlining job application management for better hiring outcomes.
