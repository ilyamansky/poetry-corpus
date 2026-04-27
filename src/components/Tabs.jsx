// src/components/Tabs.jsx
import { useState } from "react";

const Tabs = ({ tabs, children }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  return (
    <div className="w-full">
      {/* Заголовки вкладок */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="mt-4">
        {children
          .filter((child) => child.props.tabKey === activeTab)
          .map((child) => child)}
      </div>
    </div>
  );
};

export default Tabs;
