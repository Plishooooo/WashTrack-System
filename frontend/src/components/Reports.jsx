import { useState, useEffect } from 'react';
import '../styles/Reports.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';
import { API_ENDPOINTS } from '../config';

function Reports() {
  // Date range filter state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Time period filter state
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', 'today', 'last7days', 'lastMonth', 'last3Months', 'lastYear'

  // Customer segmentation state
  const [topCustomers, setTopCustomers] = useState([]);
  const [repeatCustomers, setRepeatCustomers] = useState([]);

  const [stats, setStats] = useState([
    {
      label: 'Total Revenue',
      value: '₱0',
      subtitle: 'All time',
      icon: '₱',
    },
    {
      label: 'Total Orders',
      value: '0',
      subtitle: 'All orders',
      icon: '📦',
    },
    {
      label: 'Active Customers',
      value: '0',
      subtitle: 'Registered users',
      icon: '👥',
    },
    {
      label: 'Avg. Order Value',
      value: '₱0',
      subtitle: 'Average per order',
      icon: '₱',
    },
  ]);

  const [revenueMonths, setRevenueMonths] = useState([]);
  const [ordersTrend, setOrdersTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Helper function to calculate date range based on time period
  const getDateRangeFromPeriod = (period) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'last3Months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'lastYear':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return null;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  useEffect(() => {
    fetchReportsData();
  }, [dateRange, timePeriod]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);

      const adminID = localStorage.getItem('adminID');
      
      // Fetch all reports with order details
      const reportsUrl = adminID
        ? `${API_ENDPOINTS.GET_REPORTS}?adminID=${adminID}`
        : API_ENDPOINTS.GET_REPORTS;
      const reportsResponse = await fetch(reportsUrl);
      const reportsData = await reportsResponse.json();

      // Fetch all orders for revenue calculation
      const ordersUrl = adminID
        ? `${API_ENDPOINTS.GET_ORDERS}?adminID=${adminID}`
        : API_ENDPOINTS.GET_ORDERS;
      const ordersResponse = await fetch(ordersUrl);
      const ordersData = await ordersResponse.json();

      // Fetch all users
      const usersResponse = await fetch(API_ENDPOINTS.GET_ALL_USERS);
      const usersData = await usersResponse.json();

      if (reportsData.success && ordersData.success && usersData.success) {
        // Filter to only completed orders
        let allOrders = ordersData.data || [];
        let filteredOrders = allOrders.filter(
          (order) => order.fld_orderStatus === 'Completed'
        );

        // Determine which date range to use
        let activeRange = dateRange;
        if (timePeriod !== 'all' && timePeriod) {
          const periodRange = getDateRangeFromPeriod(timePeriod);
          if (periodRange) {
            activeRange = periodRange;
          }
        }

        // Apply date range filter if specified
        if (activeRange.startDate && activeRange.endDate) {
          const startDate = new Date(activeRange.startDate);
          const endDate = new Date(activeRange.endDate);
          filteredOrders = filteredOrders.filter((order) => {
            const orderDate = new Date(order.fld_orderDate);
            return orderDate >= startDate && orderDate <= endDate;
          });
        }

        const orders = filteredOrders;
        const users = usersData.data || [];

        // Calculate customer segmentation based on filtered orders for the period
        const customerOrderCount = {};
        orders.forEach((order) => {
          customerOrderCount[order.fld_userID] =
            (customerOrderCount[order.fld_userID] || 0) + 1;
        });

        // Top customers (by total orders in the period)
        const topCustomersData = Object.entries(customerOrderCount)
          .map(([userId, count]) => {
            const user = users.find((u) => u.fld_userID === parseInt(userId));
            const totalRevenue = orders
              .filter((o) => o.fld_userID === parseInt(userId))
              .reduce((sum, o) => sum + parseFloat(o.fld_amount || 0), 0);
            return {
              userId,
              username: user?.fld_username || 'Unknown',
              orderCount: count,
              totalSpent: totalRevenue,
            };
          })
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        // Repeat customers (customers with more than 1 order in the period)
        const repeatCustomersData = Object.entries(customerOrderCount)
          .filter(([, count]) => count > 1)
          .map(([userId, count]) => {
            const user = users.find((u) => u.fld_userID === parseInt(userId));
            const totalRevenue = orders
              .filter((o) => o.fld_userID === parseInt(userId))
              .reduce((sum, o) => sum + parseFloat(o.fld_amount || 0), 0);
            return {
              userId,
              username: user?.fld_username || 'Unknown',
              orderCount: count,
              totalSpent: totalRevenue,
            };
          })
          .sort((a, b) => b.totalSpent - a.totalSpent);

        setTopCustomers(topCustomersData);
        setRepeatCustomers(repeatCustomersData);

        // Calculate statistics
        const totalRevenue = orders.reduce((sum, order) => {
          return sum + (parseFloat(order.fld_amount) || 0);
        }, 0);

        const totalOrders = orders.length;

        // Count active customers: those who registered during the period
        let activeCustomers = 0;

        // Determine the date range to use (either from timePeriod or dateRange)
        let checkRange = dateRange;
        if (timePeriod !== 'all' && timePeriod) {
          const periodRange = getDateRangeFromPeriod(timePeriod);
          if (periodRange) {
            checkRange = periodRange;
          }
        }

        if (checkRange.startDate && checkRange.endDate) {
          const startDate = new Date(checkRange.startDate);
          const endDate = new Date(checkRange.endDate);

          // Count users registered in the date range
          activeCustomers = users.filter((user) => {
            if (user.fld_registrationDate) {
              const registrationDate = new Date(user.fld_registrationDate);
              return (
                registrationDate >= startDate && registrationDate <= endDate
              );
            }
            return false;
          }).length;
        } else {
          activeCustomers = users.length;
        }

        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const getTimePeriodLabel = () => {
          if (dateRange.startDate) return 'In date range';
          switch (timePeriod) {
            case 'today':
              return 'Today';
            case 'last7days':
              return 'Last 7 days';
            case 'lastMonth':
              return 'Last month';
            case 'last3Months':
              return 'Last 3 months';
            case 'lastYear':
              return 'Last year';
            default:
              return 'All time';
          }
        };

        // Update stats
        setStats([
          {
            label: 'Total Revenue',
            value: `₱${totalRevenue.toFixed(2)}`,
            subtitle: getTimePeriodLabel(),
            icon: '₱',
          },
          {
            label: 'Total Orders',
            value: totalOrders.toString(),
            subtitle: getTimePeriodLabel(),
            icon: '📦',
          },
          {
            label: 'Active Customers',
            value: activeCustomers.toString(),
            subtitle: 'Registered users',
            icon: '👥',
          },
          {
            label: 'Avg. Order Value',
            value: `₱${avgOrderValue.toFixed(2)}`,
            subtitle: 'Average per order',
            icon: '₱',
          },
        ]);

        // Calculate monthly revenue and orders
        const monthlyData = {};
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];

        orders.forEach((order) => {
          const date = new Date(order.fld_orderDate);
          const monthIndex = date.getMonth();
          const monthKey = monthNames[monthIndex];

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, count: 0 };
          }
          monthlyData[monthKey].revenue += parseFloat(order.fld_amount) || 0;
          monthlyData[monthKey].count += 1;
        });

        // Set revenue and orders trend
        const revenueData = monthNames.map((month) => ({
          month,
          value: monthlyData[month]?.revenue || 0,
        }));

        const ordersChartData = monthNames.map((month) => ({
          month,
          value: monthlyData[month]?.count || 0,
        }));

        setRevenueMonths(revenueData);
        setOrdersTrend(ordersChartData);
        setFilteredOrders(orders);
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue =
    revenueMonths.length > 0
      ? Math.max(...revenueMonths.map((m) => m.value), 1)
      : 1;
  const maxOrders =
    ordersTrend.length > 0
      ? Math.max(...ordersTrend.map((m) => m.value), 1)
      : 1;

  const handleDownloadComprehensivePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Helper function to replace peso signs for PDF
      const formatForPDF = (text) => {
        return String(text).replace(/₱/g, 'PHP ');
      };

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 10;
      const lineHeight = 7;
      const margin = 10;

      // ===== PAGE 1: COVER PAGE & SUMMARY =====
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(102, 126, 234);
      pdf.text('Laundry Sales Report', margin, yPosition);
      yPosition += 15;

      // Report Period
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      const periodLabel =
        timePeriod !== 'all'
          ? timePeriod
              .replace(/([A-Z])/g, ' $1')
              .toUpperCase()
              .trim()
          : 'ALL TIME';
      pdf.text(`Report Period: ${periodLabel}`, margin, yPosition);
      yPosition += 7;
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        margin,
        yPosition
      );
      yPosition += 15;

      // Summary Statistics Section
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += 8;

      // Stats boxes
      pdf.setFontSize(10);
      const statsPerRow = 2;

      stats.forEach((stat, idx) => {
        const col = idx % statsPerRow;
        const row = Math.floor(idx / statsPerRow);

        if (row > 0 && col === 0) {
          yPosition += 22;
        }

        const boxX = margin + col * (pageWidth / 2 - margin);
        const boxY = yPosition;
        const boxWidth = pageWidth / 2 - margin - 5;
        const boxHeight = 18;

        // Draw box
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(boxX, boxY, boxWidth, boxHeight);

        // Label
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        pdf.text(stat.label, boxX + 5, boxY + 5);

        // Value
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(formatForPDF(stat.value), boxX + 5, boxY + 12);
        pdf.setFont(undefined, 'normal');

        // Subtitle
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(stat.subtitle, boxX + 5, boxY + 16);
      });

      yPosition += 35;

      // ===== REVENUE BREAKDOWN =====
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Revenue Breakdown by Month', margin, yPosition);
      yPosition += 8;

      // Monthly revenue table
      const monthHeaders = ['Month', 'Revenue', 'Orders'];
      const monthColWidths = [40, 40, 40];
      const cellHeight = 5;

      pdf.setFontSize(8);
      pdf.setFillColor(102, 126, 234);
      pdf.setTextColor(255, 255, 255);

      let xPos = margin;
      monthHeaders.forEach((header, i) => {
        pdf.rect(xPos, yPosition, monthColWidths[i], cellHeight, 'F');
        pdf.text(header, xPos + 3, yPosition + 3);
        xPos += monthColWidths[i];
      });
      yPosition += cellHeight;

      pdf.setTextColor(0, 0, 0);
      revenueMonths.forEach((month, idx) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 10;
        }

        const orders = ordersTrend[idx]?.value || 0;

        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          xPos = margin;
          monthColWidths.forEach((width) => {
            pdf.rect(xPos, yPosition, width, cellHeight, 'F');
            xPos += width;
          });
        }

        xPos = margin;
        const rowData = [
          month.month,
          formatForPDF(`₱${month.value.toFixed(2)}`),
          orders.toString(),
        ];

        rowData.forEach((data, i) => {
          pdf.text(String(data), xPos + 3, yPosition + 3, {
            maxWidth: monthColWidths[i] - 6,
          });
          pdf.rect(xPos, yPosition, monthColWidths[i], cellHeight);
          xPos += monthColWidths[i];
        });
        yPosition += cellHeight;
      });

      yPosition += 5;

      // ===== TOP CUSTOMERS =====
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Top Customers', margin, yPosition);
      yPosition += 8;

      const topCustHeaders = ['Rank', 'Customer', 'Orders', 'Total Spent'];
      const topCustColWidths = [15, 45, 30, 30];

      pdf.setFontSize(8);
      pdf.setFillColor(102, 126, 234);
      pdf.setTextColor(255, 255, 255);

      xPos = margin;
      topCustHeaders.forEach((header, i) => {
        pdf.rect(xPos, yPosition, topCustColWidths[i], cellHeight, 'F');
        pdf.text(header, xPos + 2, yPosition + 3);
        xPos += topCustColWidths[i];
      });
      yPosition += cellHeight;

      pdf.setTextColor(0, 0, 0);
      topCustomers.forEach((customer, idx) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 10;
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          xPos = margin;
          topCustColWidths.forEach((width) => {
            pdf.rect(xPos, yPosition, width, cellHeight, 'F');
            xPos += width;
          });
        }

        xPos = margin;
        const custRowData = [
          `#${idx + 1}`,
          customer.username,
          customer.orderCount.toString(),
          formatForPDF(`₱${customer.totalSpent.toFixed(2)}`),
        ];

        custRowData.forEach((data, i) => {
          pdf.text(String(data), xPos + 2, yPosition + 3, {
            maxWidth: topCustColWidths[i] - 4,
          });
          pdf.rect(xPos, yPosition, topCustColWidths[i], cellHeight);
          xPos += topCustColWidths[i];
        });
        yPosition += cellHeight;
      });

      yPosition += 5;

      // ===== REPEAT CUSTOMERS =====
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `Repeat Customers (${repeatCustomers.length} total)`,
        margin,
        yPosition
      );
      yPosition += 8;

      const repeatHeaders = ['Customer', 'Orders', 'Total Spent'];
      const repeatColWidths = [55, 35, 35];

      pdf.setFontSize(8);
      pdf.setFillColor(102, 126, 234);
      pdf.setTextColor(255, 255, 255);

      xPos = margin;
      repeatHeaders.forEach((header, i) => {
        pdf.rect(xPos, yPosition, repeatColWidths[i], cellHeight, 'F');
        pdf.text(header, xPos + 2, yPosition + 3);
        xPos += repeatColWidths[i];
      });
      yPosition += cellHeight;

      pdf.setTextColor(0, 0, 0);
      repeatCustomers.forEach((customer, idx) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 10;
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          xPos = margin;
          repeatColWidths.forEach((width) => {
            pdf.rect(xPos, yPosition, width, cellHeight, 'F');
            xPos += width;
          });
        }

        xPos = margin;
        const repeatRowData = [
          customer.username,
          customer.orderCount.toString(),
          formatForPDF(`₱${customer.totalSpent.toFixed(2)}`),
        ];

        repeatRowData.forEach((data, i) => {
          pdf.text(String(data), xPos + 2, yPosition + 3, {
            maxWidth: repeatColWidths[i] - 4,
          });
          pdf.rect(xPos, yPosition, repeatColWidths[i], cellHeight);
          xPos += repeatColWidths[i];
        });
        yPosition += cellHeight;
      });

      yPosition += 5;

      // ===== ALL ORDERS DETAIL =====
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `All Orders Details (${filteredOrders.length} total)`,
        margin,
        yPosition
      );
      yPosition += 8;

      if (filteredOrders.length > 0) {
        const colWidths = [18, 15, 28, 18, 18, 20];
        const headers = [
          'Order ID',
          'User ID',
          'Customer',
          'Amount',
          'Status',
          'Date',
        ];

        pdf.setFontSize(8);
        pdf.setFillColor(102, 126, 234);
        pdf.setTextColor(255, 255, 255);

        xPos = margin;
        headers.forEach((header, i) => {
          pdf.rect(xPos, yPosition, colWidths[i], cellHeight, 'F');
          pdf.text(header, xPos + 1, yPosition + 3, {
            maxWidth: colWidths[i] - 2,
          });
          xPos += colWidths[i];
        });
        yPosition += cellHeight;

        pdf.setTextColor(0, 0, 0);
        filteredOrders.forEach((order, idx) => {
          if (yPosition > pageHeight - 10) {
            pdf.addPage();
            yPosition = 10;
          }

          const user = allUsers.find((u) => u.fld_userID === order.fld_userID);
          const date = new Date(order.fld_orderDate).toLocaleDateString();
          const rowData = [
            order.fld_orderID || 'N/A',
            order.fld_userID || 'N/A',
            user?.fld_username || 'Unknown',
            formatForPDF(`₱${parseFloat(order.fld_amount || 0).toFixed(2)}`),
            order.fld_orderStatus || 'N/A',
            date,
          ];

          if (idx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            xPos = margin;
            colWidths.forEach((width) => {
              pdf.rect(xPos, yPosition, width, cellHeight, 'F');
              xPos += width;
            });
          }

          xPos = margin;
          rowData.forEach((data, i) => {
            pdf.text(String(data), xPos + 1, yPosition + 3, {
              maxWidth: colWidths[i] - 2,
            });
            pdf.rect(xPos, yPosition, colWidths[i], cellHeight);
            xPos += colWidths[i];
          });
          yPosition += cellHeight;
        });
      } else {
        pdf.setFontSize(9);
        pdf.text(
          'No orders found for the selected period.',
          margin + 5,
          yPosition
        );
      }

      // Save the PDF
      const fileName = `Sales-report-${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <section className="reports-section">
      <div className="section-header">
        <h3>Reports & Analytics</h3>
        <p>View business statistics and performance metrics</p>
      </div>

      {/* Quick Time Period Filters */}
      <div className="time-period-filters" style={{ marginBottom: '30px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '10px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
          }}
        >
          Filter by Period:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setTimePeriod('all');
              setDateRange({ startDate: '', endDate: '' });
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: timePeriod === 'all' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'all' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            All Time
          </button>
          <button
            onClick={() => setTimePeriod('today')}
            style={{
              padding: '8px 16px',
              backgroundColor: timePeriod === 'today' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'today' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            Today
          </button>
          <button
            onClick={() => setTimePeriod('last7days')}
            style={{
              padding: '8px 16px',
              backgroundColor:
                timePeriod === 'last7days' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'last7days' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimePeriod('lastMonth')}
            style={{
              padding: '8px 16px',
              backgroundColor:
                timePeriod === 'lastMonth' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'lastMonth' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            Last Month
          </button>
          <button
            onClick={() => setTimePeriod('last3Months')}
            style={{
              padding: '8px 16px',
              backgroundColor:
                timePeriod === 'last3Months' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'last3Months' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setTimePeriod('lastYear')}
            style={{
              padding: '8px 16px',
              backgroundColor:
                timePeriod === 'lastYear' ? '#667eea' : '#f0f0f0',
              color: timePeriod === 'lastYear' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            Last Year
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '20px' }}>
          Loading reports...
        </p>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <p className="stat-label">{stat.label}</p>
                  <span className="stat-icon">{stat.icon}</span>
                </div>
                <div className="stat-content">
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-subtitle">{stat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="charts-container">
            <div className="chart-section">
              <div className="chart-header">
                <h4>Revenue Overview</h4>
                <p>Monthly revenue for the year</p>
              </div>
              <div className="bar-chart">
                <div className="chart-labels">
                  <div className="y-axis-labels">
                    <div className="y-label">₱{maxRevenue.toFixed(0)}</div>
                    <div className="y-label">
                      ₱{(maxRevenue / 2).toFixed(0)}
                    </div>
                    <div className="y-label">0</div>
                  </div>
                  <div className="chart-bars">
                    {revenueMonths.map((month, index) => (
                      <div key={index} className="bar-item">
                        <div className="bar-container">
                          <div
                            className="bar"
                            style={{
                              height: `${(month.value / maxRevenue) * 200}px`,
                            }}
                          ></div>
                        </div>
                        <div className="bar-label">{month.month}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-header">
                <h4>Orders Trend</h4>
                <p>Number of orders over time</p>
              </div>
              <div className="line-chart">
                <svg viewBox="0 0 500 250" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <line
                    x1="40"
                    y1="50"
                    x2="40"
                    y2="200"
                    stroke="#ddd"
                    strokeWidth="1"
                  />
                  <line
                    x1="40"
                    y1="200"
                    x2="480"
                    y2="200"
                    stroke="#ddd"
                    strokeWidth="1"
                  />

                  {/* Y-axis labels */}
                  <text x="20" y="55" fontSize="12" fill="#999">
                    {maxOrders}
                  </text>
                  <text x="20" y="130" fontSize="12" fill="#999">
                    {Math.floor(maxOrders / 2)}
                  </text>
                  <text x="20" y="210" fontSize="12" fill="#999">
                    0
                  </text>

                  {/* Line path */}
                  <polyline
                    points={ordersTrend
                      .map(
                        (month, i) =>
                          `${65 + i * 35},${
                            200 - (month.value / maxOrders) * 150
                          }`
                      )
                      .join(' ')}
                    fill="none"
                    stroke="#27ae60"
                    strokeWidth="2"
                  />

                  {/* Data points */}
                  {ordersTrend.map((month, i) => (
                    <circle
                      key={i}
                      cx={65 + i * 35}
                      cy={200 - (month.value / maxOrders) * 150}
                      r="4"
                      fill="#27ae60"
                    />
                  ))}

                  {/* X-axis labels */}
                  {ordersTrend.map((month, i) => (
                    <text
                      key={i}
                      x={55 + i * 35}
                      y="230"
                      fontSize="12"
                      fill="#999"
                      textAnchor="middle"
                    >
                      {month.month}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Customer Segmentation */}
          <div className="customer-segmentation">
            <div className="top-customers">
              <h4>Top Customers</h4>
              <table className="segmentation-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Customer Name</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.length > 0 ? (
                    topCustomers.map((customer, index) => (
                      <tr key={customer.userId}>
                        <td>#{index + 1}</td>
                        <td>{customer.username}</td>
                        <td className="center">{customer.orderCount}</td>
                        <td>₱{customer.totalSpent.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>
                        No customer data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="repeat-customers">
              <h4>Repeat Customers ({repeatCustomers.length})</h4>
              <table className="segmentation-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Number of Orders</th>
                    <th>Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {repeatCustomers.length > 0 ? (
                    repeatCustomers.map((customer) => (
                      <tr key={customer.userId}>
                        <td>{customer.username}</td>
                        <td className="center">{customer.orderCount}</td>
                        <td>₱{customer.totalSpent.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center' }}>
                        No repeat customers yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="generate-reports">
            <h4>Generate Reports</h4>
            <p>Download detailed business report</p>
            <div className="report-buttons">
              <button
                className="report-btn"
                onClick={handleDownloadComprehensivePDF}
                style={{ backgroundColor: '#27ae60' }}
              >
                <span className="btn-icon">📋</span> Download PDF Report
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Reports;
